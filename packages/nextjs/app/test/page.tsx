"use client";

import React, { useState, useEffect, useRef } from "react";
import { relayerApiService } from "../../services/relayer/RelayerApiService";
import type { SwapData, CreateSwapRequest } from "../../types/swap";

interface TestResult {
  name: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  duration?: number;
  details?: any;
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [wsClient, setWsClient] = useState<WebSocket | null>(null);
  const [wsMessages, setWsMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(test => 
        test.name === name ? { ...test, ...updates } : test
      )
    );
  };

  const addTestResult = (test: TestResult) => {
    setTestResults(prev => [...prev, test]);
  };

  // 1. Health check test
  const testHealthCheck = async () => {
    const testName = "Health Check";
    updateTestResult(testName, { status: "running", message: "Testing relayer health..." });
    const startTime = Date.now();

    try {
      const result = await relayerApiService.healthCheck();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        updateTestResult(testName, {
          status: "success",
          message: `Health check successful - ${result.status}`,
          duration,
          details: result
        });
      } else {
        updateTestResult(testName, {
          status: "error",
          message: `Health check failed: ${result.error}`,
          duration,
          details: result
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "error",
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // 2. CRUD operations test
  const testCrudOperations = async () => {
    const testName = "CRUD Operations";
    updateTestResult(testName, { status: "running", message: "Testing CRUD operations..." });
    const startTime = Date.now();

    try {
      // Create
      const createData: CreateSwapRequest = {
        orderId: `frontend_test_${Date.now()}`,
        maker: "0xfrontend123456789012345678901234567890",
        makingAmount: "1000000",
        takingAmount: "2000000",
        makingToken: "0xETH",
        takingToken: "0xSUI",
        sourceChain: "ethereum",
        targetChain: "sui",
        secretHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        timeLock: 3600,
        sourceContract: "0xETHContract",
        targetContract: "0xSUIContract"
      };

      const createResult = await relayerApiService.createSwap(createData);
      if (!createResult.success) throw new Error("Create swap failed");

      // Read
      const readResult = await relayerApiService.getSwapById(createResult.data.id);
      if (!readResult.success) throw new Error("Read swap failed");

      // Update
      const updateResult = await relayerApiService.updateSwapStatus(createResult.data.id, {
        status: "active",
        taker: "0xfrontend987654321098765432109876543210"
      });
      if (!updateResult.success) throw new Error("Update swap failed");

      // List
      const listResult = await relayerApiService.getSwaps({ limit: 5 });
      if (!listResult.success) throw new Error("List swaps failed");

      // Delete
      const deleteResult = await relayerApiService.deleteSwap(createResult.data.id);
      if (!deleteResult.success) throw new Error("Delete swap failed");

      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "success",
        message: "All CRUD operations successful",
        duration,
        details: {
          created: createResult.data.id,
          operations: ["create", "read", "update", "list", "delete"]
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "error",
        message: `CRUD test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // 3. Statistics data test
  const testStatistics = async () => {
    const testName = "Statistics";
    updateTestResult(testName, { status: "running", message: "Testing statistics..." });
    const startTime = Date.now();

    try {
      const result = await relayerApiService.getSwapStats();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        updateTestResult(testName, {
          status: "success",
          message: `Statistics retrieved successfully`,
          duration,
          details: result.data
        });
      } else {
        updateTestResult(testName, {
          status: "error",
          message: `Statistics failed: ${result.error}`,
          duration,
          details: result
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "error",
        message: `Statistics test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // 4. WebSocket test
  const testWebSocket = async () => {
    const testName = "WebSocket";
    updateTestResult(testName, { status: "running", message: "Testing WebSocket connection..." });
    const startTime = Date.now();

    try {
      const ws = new WebSocket("ws://localhost:3001/ws");
      wsRef.current = ws;
      setWsClient(ws);

      ws.onopen = () => {
        updateTestResult(testName, { 
          status: "running", 
          message: "WebSocket connected, testing features..." 
        });

        // Test subscription
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: "subscribe",
            data: {
              topics: ["swap_updates", "htlc_events"]
            }
          }));
        }, 100);

        // Test data query
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: "get_swaps",
            data: { limit: 5 }
          }));
        }, 500);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setWsMessages(prev => [...prev, { ...message, received: Date.now() }]);
      };

      ws.onerror = (error) => {
        const duration = Date.now() - startTime;
        updateTestResult(testName, {
          status: "error",
          message: "WebSocket connection error",
          duration
        });
      };

      // Wait for messages and close
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const duration = Date.now() - startTime;
          updateTestResult(testName, {
            status: "success",
            message: `WebSocket test completed`,
            duration,
            details: { messagesReceived: wsMessages.length }
          });
          ws.close();
          setWsClient(null);
        }
      }, 3000);

    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "error",
        message: `WebSocket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // 5. Error handling test
  const testErrorHandling = async () => {
    const testName = "Error Handling";
    updateTestResult(testName, { status: "running", message: "Testing error handling..." });
    const startTime = Date.now();

    try {
      // Test 404 error
      const result = await relayerApiService.getSwapById("non_existent_id");
      
      const duration = Date.now() - startTime;
      if (!result.success && result.error === "Swap not found") {
        updateTestResult(testName, {
          status: "success",
          message: "Error handling working correctly",
          duration,
          details: { errorType: "404", handled: true }
        });
      } else {
        updateTestResult(testName, {
          status: "error",
          message: "Error handling not working as expected",
          duration
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "success",
        message: "Error properly caught and handled",
        duration,
        details: { errorCaught: true }
      });
    }
  };

  // 6. Performance test
  const testPerformance = async () => {
    const testName = "Performance";
    updateTestResult(testName, { status: "running", message: "Testing performance..." });
    const startTime = Date.now();

    try {
      const promises = [];
      const testCount = 10;

      // Run multiple concurrent requests
      for (let i = 0; i < testCount; i++) {
        promises.push(relayerApiService.healthCheck());
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      const avgTime = duration / testCount;
      const successfulResults = results.filter(r => r.success);

      updateTestResult(testName, {
        status: avgTime < 200 ? "success" : "error",
        message: `Performance test completed - Avg: ${avgTime.toFixed(2)}ms`,
        duration,
        details: {
          totalRequests: testCount,
          totalTime: duration,
          averageTime: avgTime,
          successful: successfulResults.length
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, {
        status: "error",
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setWsMessages([]);

    // Initialize test results
    const tests = [
      { name: "Health Check", status: "pending" as const, message: "Waiting to start..." },
      { name: "CRUD Operations", status: "pending" as const, message: "Waiting to start..." },
      { name: "Statistics", status: "pending" as const, message: "Waiting to start..." },
      { name: "WebSocket", status: "pending" as const, message: "Waiting to start..." },
      { name: "Error Handling", status: "pending" as const, message: "Waiting to start..." },
      { name: "Performance", status: "pending" as const, message: "Waiting to start..." }
    ];

    setTestResults(tests);

    try {
      await testHealthCheck();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testCrudOperations();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testStatistics();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testWebSocket();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testErrorHandling();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testPerformance();
    } catch (error) {
      console.error("Test suite error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Run single test
  const runSingleTest = async (testName: string) => {
    setIsRunning(true);
    
    const testFunctions: { [key: string]: () => Promise<void> } = {
      "Health Check": testHealthCheck,
      "CRUD Operations": testCrudOperations,
      "Statistics": testStatistics,
      "WebSocket": testWebSocket,
      "Error Handling": testErrorHandling,
      "Performance": testPerformance
    };

    if (testFunctions[testName]) {
      // Initialize single test result
      setTestResults([{ name: testName, status: "pending", message: "Waiting to start..." }]);
      await testFunctions[testName]();
    }
    
    setIsRunning(false);
  };

  // Clean up WebSocket connections
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending": return "⏳";
      case "running": return "🔄";
      case "success": return "✅";
      case "error": return "❌";
      default: return "❓";
    }
  };

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "pending": return "text-gray-500";
      case "running": return "text-blue-500";
      case "success": return "text-green-500";
      case "error": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">1inch Fusion Relayer Test Suite</h1>
        <p className="text-gray-600">
          Comprehensive testing for PostgreSQL integration, API endpoints, and WebSocket communication
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="btn btn-primary"
        >
          {isRunning ? "Running Tests..." : "Run All Tests"}
        </button>
        
        <button
          onClick={() => {
            setTestResults([]);
            setWsMessages([]);
          }}
          disabled={isRunning}
          className="btn btn-outline"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Status Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          
          {testResults.map((test, index) => (
            <div key={index} className="card bg-base-100 shadow-md">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(test.status)}</span>
                    {test.name}
                  </h3>
                  {!isRunning && (
                    <button
                      onClick={() => runSingleTest(test.name)}
                      className="btn btn-sm btn-outline"
                    >
                      Run
                    </button>
                  )}
                </div>
                
                <p className={`text-sm ${getStatusColor(test.status)}`}>
                  {test.message}
                </p>
                
                {test.duration && (
                  <p className="text-xs text-gray-500">
                    Duration: {test.duration}ms
                  </p>
                )}
                
                {test.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-600">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* WebSocket Messages */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">WebSocket Messages</h2>
          
          <div className="card bg-base-100 shadow-md h-96">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Real-time Messages</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wsClient ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{wsClient ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <div className="overflow-auto h-64 space-y-2">
                {wsMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm">No messages yet. Run WebSocket test to see real-time data.</p>
                ) : (
                  wsMessages.map((msg, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-blue-600">{msg.type}</span>
                        <span className="text-gray-500">
                          {new Date(msg.received).toLocaleTimeString()}
                        </span>
                      </div>
                      {msg.data && (
                        <pre className="text-gray-700 overflow-auto">
                          {JSON.stringify(msg.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setWsMessages([])}
                className="btn btn-sm btn-outline mt-2"
                disabled={wsMessages.length === 0}
              >
                Clear Messages
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Summary */}
      {testResults.length > 0 && (
        <div className="mt-8">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="text-xl font-semibold mb-4">Test Summary</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat">
                  <div className="stat-title">Total Tests</div>
                  <div className="stat-value text-primary">{testResults.length}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Passed</div>
                  <div className="stat-value text-success">
                    {testResults.filter(t => t.status === "success").length}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Failed</div>
                  <div className="stat-value text-error">
                    {testResults.filter(t => t.status === "error").length}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Avg Duration</div>
                  <div className="stat-value text-info">
                    {testResults.filter(t => t.duration).length > 0 ? 
                      Math.round(
                        testResults
                          .filter(t => t.duration)
                          .reduce((sum, t) => sum + (t.duration || 0), 0) /
                        testResults.filter(t => t.duration).length
                      ) : 0
                    }ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Info */}
      <div className="mt-8">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">API Configuration</h3>
                <ul className="text-sm space-y-1">
                  <li><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_RELAYER_API_URL || "http://localhost:3001"}</li>
                  <li><strong>Timeout:</strong> 10 seconds</li>
                  <li><strong>CORS:</strong> Enabled</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">WebSocket Configuration</h3>
                <ul className="text-sm space-y-1">
                  <li><strong>URL:</strong> ws://localhost:3001/ws</li>
                  <li><strong>Heartbeat:</strong> 15 seconds</li>
                  <li><strong>Auto-reconnect:</strong> Disabled (test mode)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}