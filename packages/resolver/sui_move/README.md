# SUI Move Cross-Chain Dutch Auction & Escrow System

这是一个基于 SUI Move 实现的跨链荷兰式拍卖和托管系统，对应 EVM 合约中的 `DutchAuctionEVM.sol` 和 `SUIEscrow.sol` 功能。

## 概述

该系统实现了以下核心功能：

1. **跨链托管 (Cross-Chain Escrow)**：安全锁定 SUI 代币，支持基于秘密哈希的解锁机制
2. **荷兰式拍卖 (Dutch Auction)**：价格随时间线性衰减的拍卖机制
3. **协议费用管理**：内置协议费用收取和管理功能
4. **时间锁机制**：支持时间锁和紧急退款功能

## 核心组件

### 数据结构

#### AuctionRegistry
主要的注册表对象，管理所有拍卖和托管：
- `auctions`: 拍卖数据表
- `escrows`: 托管数据表
- `protocol_fee_balance`: 协议费用余额
- `admin`: 管理员地址

#### Auction
单个拍卖对象：
- `start_price` / `end_price`: 起始价格和结束价格
- `duration`: 拍卖持续时间
- `secret_hash`: 秘密哈希（用于跨链验证）
- `winner` / `final_price`: 获胜者和最终价格

#### Escrow
托管对象：
- `locked_balance`: 锁定的 SUI 余额
- `timelock`: 时间锁
- `secret_hash`: 秘密哈希
- `beneficiary`: 受益人地址

### 核心功能

#### 托管功能

1. **创建托管** (`create_escrow`)
   ```move
   public entry fun create_escrow(
       registry: &mut AuctionRegistry,
       payment: Coin<SUI>,
       secret_hash: vector<u8>,
       timelock: u64,
       metadata: String,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```

2. **揭示秘密** (`reveal_secret`)
   ```move
   public entry fun reveal_secret(
       registry: &mut AuctionRegistry,
       escrow_id: u64,
       secret: String,
       beneficiary: address,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```

3. **释放资金** (`release_escrow_funds`)
   ```move
   public entry fun release_escrow_funds(
       registry: &mut AuctionRegistry,
       escrow_id: u64,
       ctx: &mut TxContext
   )
   ```

4. **一键揭示并释放** (`reveal_and_release`)
   - 优化的 Gas 消耗
   - 原子性操作

#### 拍卖功能

1. **创建拍卖** (`create_auction`)
   ```move
   public entry fun create_auction(
       registry: &mut AuctionRegistry,
       escrow_id: u64,
       start_price: u64,
       end_price: u64,
       duration: u64,
       secret_hash: vector<u8>,
       metadata: String,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```

2. **出价** (`place_bid`)
   ```move
   public entry fun place_bid(
       registry: &mut AuctionRegistry,
       auction_id: u64,
       payment: Coin<SUI>,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```

3. **结束过期拍卖** (`end_expired_auction`)

#### 查询功能

- `get_current_price`: 获取当前拍卖价格
- `is_auction_active`: 检查拍卖是否活跃
- `can_reveal_escrow`: 检查托管是否可以揭示
- `can_refund_escrow`: 检查托管是否可以退款
- `get_time_remaining`: 获取拍卖剩余时间

## 安全特性

### 错误处理
系统定义了完整的错误代码：
- `EInvalidPrice`: 无效价格
- `EAuctionNotActive`: 拍卖未激活
- `EInvalidSecret`: 无效秘密
- `EUnauthorized`: 未授权操作
- 等等...

### 时间安全
- **揭示窗口**: 24小时的秘密揭示窗口
- **最大持续时间**: 拍卖最长7天
- **时间锁验证**: 严格的时间锁检查

### 访问控制
- **管理员权限**: 使用 `AdminCap` 进行权限管理
- **所有者验证**: 严格的所有者身份验证
- **状态检查**: 完整的状态一致性检查

## 经济模型

### 协议费用
- **费率**: 2.5% (250 basis points)
- **收取方式**: 从每次成功出价中扣除
- **管理**: 管理员可提取累积费用

### 价格机制
- **线性衰减**: 价格随时间线性下降
- **即时成交**: 荷兰式拍卖，首次出价即成交
- **最低价格**: 设置最低结束价格保护

## 事件系统

系统发出以下事件：
- `AuctionCreated`: 拍卖创建
- `BidPlaced`: 出价事件
- `AuctionEnded`: 拍卖结束
- `EscrowCreated`: 托管创建
- `SecretRevealed`: 秘密揭示
- `EscrowReleased`: 托管释放
- `EscrowRefunded`: 托管退款

## 部署和使用

### 编译
```bash
sui move build
```

### 测试
```bash
sui move test
```

### 部署
```bash
sui client publish --gas-budget 100000000
```

### 初始化
部署后会自动创建：
- `AuctionRegistry` 共享对象
- `AdminCap` 管理员权限对象

## 跨链集成

该合约设计用于与 EVM 链上的 1inch Fusion+ 协议集成：

1. **SUI 端**: 创建托管和拍卖
2. **EVM 端**: 通过 Fusion+ 解析器处理订单
3. **跨链验证**: 使用秘密哈希进行跨链状态同步
4. **资金释放**: 基于跨链验证结果释放托管资金

## 技术特点

- **Gas 优化**: 提供 `reveal_and_release` 等优化函数
- **原子性**: 关键操作保证原子性
- **可扩展性**: 模块化设计，易于扩展
- **安全性**: 多层安全检查和验证
- **兼容性**: 与 SUI 生态系统完全兼容

## 注意事项

1. **时间精度**: 使用毫秒级时间戳
2. **秘密管理**: 秘密哈希需要安全生成和管理
3. **Gas 费用**: 复杂操作需要足够的 Gas 预算
4. **网络同步**: 跨链操作需要考虑网络延迟

## 许可证

本项目遵循相应的开源许可证。