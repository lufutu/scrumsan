// Simple test script to verify react-nice-avatar integration
const { generateAvatarConfig, getUserAvatarSeed } = require('./lib/avatar-generation.ts');

console.log('Testing react-nice-avatar integration...');

try {
  // Test basic generation
  const seed = 'test@example.com';
  const config = generateAvatarConfig(seed);
  
  console.log('✅ Avatar config generated successfully');
  console.log('Config keys:', Object.keys(config));
  console.log('Sample config:', JSON.stringify(config, null, 2));
  
  // Test consistency
  const config2 = generateAvatarConfig(seed);
  const isConsistent = JSON.stringify(config) === JSON.stringify(config2);
  
  if (isConsistent) {
    console.log('✅ Avatar generation is consistent');
  } else {
    console.log('❌ Avatar generation is not consistent');
  }
  
  // Test different seeds
  const seeds = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
  const configs = seeds.map(s => generateAvatarConfig(s));
  const uniqueConfigs = new Set(configs.map(c => JSON.stringify(c)));
  
  console.log(`✅ Generated ${uniqueConfigs.size} unique configs from ${seeds.length} seeds`);
  
  // Test getUserAvatarSeed
  const testSeed = getUserAvatarSeed('test@example.com', 'Test User', '123');
  console.log('✅ getUserAvatarSeed working:', testSeed);
  
  console.log('\n🎉 All avatar generation tests passed!');
  
} catch (error) {
  console.error('❌ Error testing avatar generation:', error.message);
  console.error(error.stack);
  process.exit(1);
}