# SUI Move Cross-Chain Auction Usage Examples

本文档提供了使用 SUI Move 跨链拍卖和托管系统的详细示例。

## 前置条件

1. 安装 SUI CLI
2. 配置 SUI 客户端
3. 部署合约（使用 `scripts/deploy.sh`）
4. 获取部署信息（Package ID, Registry ID, Admin Cap ID）

## 基本概念

### 时间戳格式
所有时间参数使用毫秒级 Unix 时间戳：
```bash
# 获取当前时间戳（毫秒）
date +%s000

# 获取24小时后的时间戳
echo $(($(date +%s) * 1000 + 86400000))
```

### 秘密哈希生成
```bash
# 使用 openssl 生成 SHA3-256 哈希
echo -n "your_secret_here" | openssl dgst -sha3-256 -binary | xxd -p

# 或使用 Python
python3 -c "import hashlib; print(hashlib.sha3_256(b'your_secret_here').hexdigest())"
```

### 向量格式
在 SUI CLI 中，向量使用以下格式：
```bash
# 字节向量示例
[0x48, 0x65, 0x6c, 0x6c, 0x6f]  # "Hello" 的字节表示

# 哈希向量示例（32字节）
[0xa1, 0xb2, 0xc3, ...] # 32个字节的哈希值
```

## 完整工作流程示例

### 步骤 1: 创建托管

```bash
# 环境变量
export PACKAGE_ID="0x..."  # 从部署信息获取
export REGISTRY_ID="0x..." # 从部署信息获取
export SECRET="my_secret_123"
export SECRET_HASH="[0xa1, 0xb2, 0xc3, ...]"  # SHA3-256 哈希
export TIMELOCK=$(($(date +%s) * 1000 + 86400000))  # 24小时后
export ESCROW_AMOUNT=1000000000  # 1 SUI (in MIST)

# 获取 SUI coin 对象
export COIN_ID=$(sui client gas --json | jq -r '.[] | select(.mistBalance >= 1000000000) | .gasCoinId' | head -1)

# 创建托管
sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function create_escrow \
  --args $REGISTRY_ID $COIN_ID $SECRET_HASH $TIMELOCK '"Cross-chain escrow for auction"' 0x6 \
  --gas-budget 10000000
```

### 步骤 2: 创建拍卖

```bash
# 拍卖参数
export ESCROW_ID=0  # 从步骤1的输出获取
export START_PRICE=500000000   # 0.5 SUI
export END_PRICE=100000000     # 0.1 SUI
export DURATION=3600000        # 1小时

# 等待时间锁到期
echo "Waiting for timelock to expire..."
sleep $((TIMELOCK/1000 - $(date +%s) + 1))

# 创建拍卖
sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function create_auction \
  --args $REGISTRY_ID $ESCROW_ID $START_PRICE $END_PRICE $DURATION $SECRET_HASH '"Dutch auction for cross-chain asset"' 0x6 \
  --gas-budget 10000000
```

### 步骤 3: 查询当前价格

```bash
# 获取当前价格（只读操作）
sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function get_current_price \
  --args $REGISTRY_ID 0 0x6 \
  --gas-budget 1000000
```

### 步骤 4: 出价

```bash
# 计算所需支付金额（价格 + 协议费）
export CURRENT_PRICE=400000000  # 从步骤3获取
export PROTOCOL_FEE=$((CURRENT_PRICE * 250 / 10000))  # 2.5%
export TOTAL_PAYMENT=$((CURRENT_PRICE + PROTOCOL_FEE))

# 获取足够的 SUI coin
export BID_COIN_ID=$(sui client gas --json | jq -r ".[] | select(.mistBalance >= $TOTAL_PAYMENT) | .gasCoinId" | head -1)

# 出价
sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function place_bid \
  --args $REGISTRY_ID 0 $BID_COIN_ID 0x6 \
  --gas-budget 10000000
```

### 步骤 5: 揭示秘密并释放托管

```bash
# 揭示秘密并释放资金给获胜者
export WINNER_ADDRESS="0x..."  # 获胜者地址

sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function reveal_and_release \
  --args $REGISTRY_ID $ESCROW_ID '"'$SECRET'"' $WINNER_ADDRESS 0x6 \
  --gas-budget 10000000
```

## 高级用例

### 批量操作示例

```bash
#!/bin/bash
# 批量创建多个托管

for i in {1..5}; do
  SECRET="secret_$i"
  SECRET_HASH=$(python3 -c "import hashlib; print('[' + ', '.join(['0x' + format(b, '02x') for b in hashlib.sha3_256(b'$SECRET').digest()]) + ']')")
  TIMELOCK=$(($(date +%s) * 1000 + 86400000))
  
  sui client call \
    --package $PACKAGE_ID \
    --module cross_chain_auction \
    --function create_escrow \
    --args $REGISTRY_ID $COIN_ID "$SECRET_HASH" $TIMELOCK '"Batch escrow '$i'"' 0x6 \
    --gas-budget 10000000
    
  echo "Created escrow $i"
  sleep 2
done
```

### 价格监控脚本

```bash
#!/bin/bash
# 监控拍卖价格变化

AUCTION_ID=0
while true; do
  PRICE=$(sui client call \
    --package $PACKAGE_ID \
    --module cross_chain_auction \
    --function get_current_price \
    --args $REGISTRY_ID $AUCTION_ID 0x6 \
    --gas-budget 1000000 2>/dev/null | grep -o '[0-9]\+' | tail -1)
    
  echo "$(date): Current price: $PRICE MIST"
  sleep 30
done
```

### 管理员操作

```bash
# 提取协议费用（需要 AdminCap）
export ADMIN_CAP_ID="0x..."  # 从部署信息获取
export RECIPIENT_ADDRESS="0x..."  # 接收费用的地址

sui client call \
  --package $PACKAGE_ID \
  --module cross_chain_auction \
  --function withdraw_protocol_fees \
  --args $ADMIN_CAP_ID $REGISTRY_ID $RECIPIENT_ADDRESS \
  --gas-budget 10000000
```

## 错误处理

### 常见错误及解决方案

1. **EInvalidPrice (1)**
   ```bash
   # 确保价格参数正确
   # start_price > end_price > 0
   ```

2. **EAuctionNotActive (3)**
   ```bash
   # 检查拍卖状态
   sui client call --package $PACKAGE_ID --module cross_chain_auction --function is_auction_active --args $REGISTRY_ID $AUCTION_ID 0x6
   ```

3. **EInsufficientPayment (6)**
   ```bash
   # 计算正确的支付金额（包含协议费）
   TOTAL = CURRENT_PRICE + (CURRENT_PRICE * 250 / 10000)
   ```

4. **EInvalidSecret (8)**
   ```bash
   # 验证秘密哈希
   python3 -c "import hashlib; print(hashlib.sha3_256(b'your_secret').hexdigest())"
   ```

## 集成指南

### 与 EVM 链集成

1. **SUI 端操作**：
   - 创建托管锁定资产
   - 创建荷兰式拍卖
   - 等待跨链验证

2. **EVM 端操作**：
   - 使用 1inch Fusion+ 处理订单
   - 验证 SUI 链状态
   - 触发资金释放

3. **跨链同步**：
   - 使用相同的秘密哈希
   - 协调时间锁设置
   - 监控两链状态

### JavaScript SDK 示例

```javascript
// 使用 @mysten/sui.js
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// 创建托管
async function createEscrow(packageId, registryId, coinId, secretHash, timelock, metadata) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${packageId}::cross_chain_auction::create_escrow`,
    arguments: [
      tx.object(registryId),
      tx.object(coinId),
      tx.pure(secretHash),
      tx.pure(timelock),
      tx.pure(metadata),
      tx.object('0x6')
    ]
  });
  
  return await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: keypair
  });
}
```

## 测试网络信息

- **网络**: Sui Testnet
- **RPC**: https://fullnode.testnet.sui.io:443
- **水龙头**: https://discord.gg/sui (获取测试 SUI)
- **浏览器**: https://suiexplorer.com/?network=testnet

## 安全注意事项

1. **秘密管理**：
   - 使用强随机数生成器
   - 安全存储秘密值
   - 及时揭示秘密

2. **时间同步**：
   - 考虑网络延迟
   - 设置合理的时间缓冲
   - 监控时间锁状态

3. **Gas 管理**：
   - 预留足够的 Gas
   - 监控 Gas 价格
   - 使用批量操作优化

4. **错误恢复**：
   - 实现重试机制
   - 监控交易状态
   - 准备应急方案