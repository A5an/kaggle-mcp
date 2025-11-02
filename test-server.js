#!/usr/bin/env node
/**
 * Test script for Kaggle MCP Server
 * Tests the server functionality locally before deployment
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testKaggleCLI() {
    console.log('🧪 Testing Kaggle CLI Installation');
    console.log('-'.repeat(40));
    
    try {
        // Test if kaggle CLI is installed
        const { stdout, stderr } = await execAsync('kaggle --version', { timeout: 10000 });
        console.log('✅ Kaggle CLI installed:', stdout.trim());
        
        // Test if credentials work
        const { stdout: listOutput } = await execAsync('kaggle competitions list --json | head -1', {
            env: {
                ...process.env,
                KAGGLE_USERNAME: 'asanaliaukenov',
                KAGGLE_KEY: '3afe58ac6593f0ac4ad52789536ab1f1'
            },
            timeout: 30000
        });
        
        if (listOutput.trim()) {
            console.log('✅ Kaggle credentials working');
            console.log('   Sample output:', listOutput.trim().substring(0, 100) + '...');
        } else {
            console.log('❌ Kaggle credentials not working - no output');
        }
        
    } catch (error) {
        console.log('❌ Kaggle CLI test failed:', error.message);
        
        if (error.message.includes('kaggle: command not found')) {
            console.log('\n💡 To fix this:');
            console.log('   1. Install Kaggle CLI: pip install kaggle');
            console.log('   2. Or use npm: npm install -g kaggle-api');
        }
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 To fix credentials:');
            console.log('   1. Download kaggle.json from https://www.kaggle.com/account');
            console.log('   2. Set KAGGLE_USERNAME and KAGGLE_KEY environment variables');
        }
    }
}

async function testServerTools() {
    console.log('\n🛠️  Testing Server Tool Logic');
    console.log('-'.repeat(40));
    
    // Mock config
    const config = {
        kaggleUsername: 'asanaliaukenov',
        kaggleKey: '3afe58ac6593f0ac4ad52789536ab1f1'
    };
    
    // Test search competitions logic
    try {
        const env = {
            ...process.env,
            KAGGLE_USERNAME: config.kaggleUsername,
            KAGGLE_KEY: config.kaggleKey
        };
        
        const command = 'kaggle competitions list -s "titanic" --json';
        console.log(`Testing command: ${command}`);
        
        const { stdout, stderr } = await execAsync(command, { env, timeout: 30000 });
        
        if (stdout.trim()) {
            const competitions = JSON.parse(stdout);
            console.log('✅ Competition search working');
            console.log(`   Found ${competitions.length} competitions`);
            
            if (competitions.length > 0) {
                console.log(`   Sample: ${competitions[0].title || competitions[0].ref}`);
            }
        } else {
            console.log('❌ No competition data returned');
        }
        
    } catch (error) {
        console.log('❌ Competition search failed:', error.message);
    }
}

async function main() {
    console.log('🔍 Kaggle MCP Server - Local Testing');
    console.log('='.repeat(50));
    
    await testKaggleCLI();
    await testServerTools();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log('If all tests pass, the server should work when deployed to Metorial.');
    console.log('If tests fail, fix the issues before deploying.');
}

if (require.main === module) {
    main().catch(console.error);
}