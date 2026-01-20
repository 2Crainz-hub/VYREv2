import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ikoqldnbuwulyzpurlyv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3FsZG5idXd1bHl6cHVybHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDI5OTQsImV4cCI6MjA4NDM3ODk5NH0.QKz1CigzkMKjbxKb-Kvqruk1P2DSxBHi9ktWx8s23Fk'
);

export default function App() {
  const [testResult, setTestResult] = useState(
    'Testing Supabase connection...'
  );

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count');
        if (error) {
          setTestResult(`❌ Error: ${error.message}`);
        } else {
          setTestResult('✅ Supabase connected successfully!');
        }
      } catch (err) {
        setTestResult(`❌ Connection failed: ${err}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'system-ui',
        background: '#000',
        color: '#fff',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ color: '#a855f7' }}>VYRE - Supabase Test</h1>
      <p style={{ fontSize: '20px', marginTop: '20px' }}>{testResult}</p>
    </div>
  );
}
