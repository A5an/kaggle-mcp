import { metorial, z } from '@metorial/mcp-server-sdk';

/**
 * Diagnostic Kaggle MCP Server
 * Tests server environment and dependencies
 */

interface Config {
    kaggleUsername: string;
    kaggleKey: string;
}

metorial.createServer<Config>(
    {
        name: 'kaggle-diagnostic-server',
        version: '1.0.0'
    },
    async (server, config) => {
        console.log('Diagnostic Kaggle MCP Server starting...');

        /**
         * Tool: test_environment
         * Test the server environment and dependencies
         */
        server.registerTool(
            'test_environment',
            {
                title: 'Test Server Environment',
                description: 'Test if the server environment has all required dependencies.',
                inputSchema: {}
            },
            async () => {
                try {
                    console.log('Testing server environment...');

                    const { exec } = await import('node:child_process');
                    const { promisify } = await import('node:util');
                    const execAsync = promisify(exec);

                    const tests = [];

                    // Test 1: Node.js version
                    try {
                        const { stdout } = await execAsync('node --version', { timeout: 5000 });
                        tests.push({ test: 'Node.js', status: 'OK', result: stdout.trim() });
                    } catch (error: any) {
                        tests.push({ test: 'Node.js', status: 'FAIL', error: error.message });
                    }

                    // Test 2: Python availability
                    try {
                        const { stdout } = await execAsync('python --version', { timeout: 5000 });
                        tests.push({ test: 'Python', status: 'OK', result: stdout.trim() });
                    } catch (error: any) {
                        try {
                            const { stdout } = await execAsync('python3 --version', { timeout: 5000 });
                            tests.push({ test: 'Python3', status: 'OK', result: stdout.trim() });
                        } catch (error2: any) {
                            tests.push({ test: 'Python', status: 'FAIL', error: 'Neither python nor python3 found' });
                        }
                    }

                    // Test 3: Pip availability
                    try {
                        const { stdout } = await execAsync('pip --version', { timeout: 5000 });
                        tests.push({ test: 'Pip', status: 'OK', result: stdout.trim() });
                    } catch (error: any) {
                        try {
                            const { stdout } = await execAsync('pip3 --version', { timeout: 5000 });
                            tests.push({ test: 'Pip3', status: 'OK', result: stdout.trim() });
                        } catch (error2: any) {
                            tests.push({ test: 'Pip', status: 'FAIL', error: 'Neither pip nor pip3 found' });
                        }
                    }

                    // Test 4: Kaggle CLI availability
                    try {
                        const { stdout } = await execAsync('kaggle --version', { timeout: 10000 });
                        tests.push({ test: 'Kaggle CLI', status: 'OK', result: stdout.trim() });
                    } catch (error: any) {
                        tests.push({ test: 'Kaggle CLI', status: 'FAIL', error: error.message });
                    }

                    // Test 5: Environment variables
                    const envTests = [
                        { name: 'KAGGLE_USERNAME', value: config.kaggleUsername },
                        { name: 'KAGGLE_KEY', value: config.kaggleKey }
                    ];

                    envTests.forEach(env => {
                        if (env.value) {
                            tests.push({
                                test: `Config: ${env.name}`,
                                status: 'OK',
                                result: `Set (${env.value.length} chars)`
                            });
                        } else {
                            tests.push({
                                test: `Config: ${env.name}`,
                                status: 'FAIL',
                                error: 'Not configured'
                            });
                        }
                    });

                    // Test 6: Try installing Kaggle CLI if missing
                    const kaggleTest = tests.find(t => t.test === 'Kaggle CLI');
                    if (kaggleTest && kaggleTest.status === 'FAIL') {
                        try {
                            console.log('Attempting to install Kaggle CLI...');
                            const { stdout, stderr } = await execAsync('pip install kaggle', { timeout: 60000 });
                            tests.push({
                                test: 'Kaggle CLI Installation',
                                status: 'ATTEMPTED',
                                result: `stdout: ${stdout}, stderr: ${stderr}`
                            });

                            // Test again after installation
                            try {
                                const { stdout: versionOutput } = await execAsync('kaggle --version', { timeout: 10000 });
                                tests.push({
                                    test: 'Kaggle CLI (after install)',
                                    status: 'OK',
                                    result: versionOutput.trim()
                                });
                            } catch (error: any) {
                                tests.push({
                                    test: 'Kaggle CLI (after install)',
                                    status: 'FAIL',
                                    error: error.message
                                });
                            }
                        } catch (error: any) {
                            tests.push({
                                test: 'Kaggle CLI Installation',
                                status: 'FAIL',
                                error: error.message
                            });
                        }
                    }

                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: JSON.stringify({
                                    message: 'Server environment diagnostic complete',
                                    timestamp: new Date().toISOString(),
                                    tests: tests,
                                    summary: {
                                        total: tests.length,
                                        passed: tests.filter(t => t.status === 'OK').length,
                                        failed: tests.filter(t => t.status === 'FAIL').length
                                    }
                                }, null, 2)
                            }
                        ]
                    };

                } catch (error: any) {
                    console.error(`Error in environment test: ${error.message}`);
                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: JSON.stringify({
                                    error: `Environment test failed: ${error.message}`,
                                    stack: error.stack
                                })
                            }
                        ]
                    };
                }
            }
        );

        /**
         * Tool: simple_kaggle_test
         * Test a simple Kaggle command
         */
        server.registerTool(
            'simple_kaggle_test',
            {
                title: 'Simple Kaggle Test',
                description: 'Test a simple Kaggle CLI command.',
                inputSchema: {}
            },
            async () => {
                try {
                    console.log('Testing simple Kaggle command...');

                    const { exec } = await import('node:child_process');
                    const { promisify } = await import('node:util');
                    const execAsync = promisify(exec);

                    if (!config.kaggleUsername || !config.kaggleKey) {
                        return {
                            content: [
                                {
                                    type: 'text' as const,
                                    text: JSON.stringify({
                                        error: 'Kaggle credentials not configured'
                                    })
                                }
                            ]
                        };
                    }

                    const env = {
                        ...process.env,
                        KAGGLE_USERNAME: config.kaggleUsername,
                        KAGGLE_KEY: config.kaggleKey
                    };

                    // Try a simple command
                    const { stdout, stderr } = await execAsync('kaggle competitions list --json | head -1', {
                        env,
                        timeout: 30000
                    });

                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: JSON.stringify({
                                    success: true,
                                    message: 'Simple Kaggle test completed',
                                    stdout: stdout,
                                    stderr: stderr
                                }, null, 2)
                            }
                        ]
                    };

                } catch (error: any) {
                    console.error(`Error in simple Kaggle test: ${error.message}`);
                    return {
                        content: [
                            {
                                type: 'text' as const,
                                text: JSON.stringify({
                                    error: `Simple Kaggle test failed: ${error.message}`,
                                    details: error.stack
                                })
                            }
                        ]
                    };
                }
            }
        );

        console.log('Diagnostic Kaggle MCP Server initialized successfully');
    }
);