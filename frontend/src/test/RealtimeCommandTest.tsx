/**
 * 🧪 Realtime AI Command Test
 * 
 * Test component to verify realtime AI command parsing works
 */

import React, { useState } from 'react';
import { useRealtimeCommandParser } from '../hooks/useRealtimeCommandParser';

interface RealtimeCommandTestProps {
  socket: any;
  sessionId: string;
}

export const RealtimeCommandTest: React.FC<RealtimeCommandTestProps> = ({ socket, sessionId }) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const realtimeCommandParser = useRealtimeCommandParser({
    socket,
    sessionId,
    onCommandExecuted: (result) => {
      setTestResults(prev => [...prev, `✅ Command executed: ${result.action} - ${result.message}`]);
    }
  });

  const testCommands = [
    'Be my eye',
    'Can you be my eyes',
    'Describe what you see',
    'Read the text',
    'Help me navigate',
    'Find my keys',
    'Is it safe',
    'Look left',
    'Volume up',
    'Help',
    'What can you do'
  ];

  const runTest = async (command: string) => {
    setIsProcessing(true);
    setTestResults(prev => [...prev, `🧪 Testing: "${command}"`]);
    
    try {
      const success = await realtimeCommandParser.processVoiceInput(command);
      if (success) {
        setTestResults(prev => [...prev, `✅ Success: "${command}"`]);
      } else {
        setTestResults(prev => [...prev, `❌ Failed: "${command}"`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Error: "${command}" - ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    for (const command of testCommands) {
      await runTest(command);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🧪 Realtime AI Command Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? 'Testing...' : 'Run All Tests'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Individual Tests:</h3>
        {testCommands.map((command, index) => (
          <button
            key={index}
            onClick={() => runTest(command)}
            disabled={isProcessing}
            style={{
              margin: '5px',
              padding: '5px 10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            "{command}"
          </button>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Test Results:</h3>
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '5px',
          padding: '10px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {testResults.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No tests run yet. Click "Run All Tests" to start.</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#6c757d', fontSize: '12px' }}>
        <p><strong>Note:</strong> This test requires:</p>
        <ul>
          <li>Backend server running on port 3000</li>
          <li>OpenAI API key configured</li>
          <li>WebSocket connection established</li>
          <li>Realtime session active</li>
        </ul>
      </div>
    </div>
  );
};
