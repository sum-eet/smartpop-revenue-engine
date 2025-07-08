// Test email validation from deployed function
const script = `
window.validateEmail = function(email) {
  console.log('🔍 Validating email:', email);
  
  // Basic checks first
  if (!email || typeof email !== 'string') {
    console.log('❌ Email is empty or not string');
    return false;
  }
  
  const cleanEmail = email.trim();
  
  // Length validation
  if (cleanEmail.length < 3 || cleanEmail.length > 254) {
    console.log('❌ Email length invalid:', cleanEmail.length);
    return false;
  }
  
  // Must contain exactly one @
  const atCount = (cleanEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    console.log('❌ Must contain exactly one @, found:', atCount);
    return false;
  }
  
  // Split by @
  const parts = cleanEmail.split('@');
  const [local, domain] = parts;
  
  // Local part (before @) validation
  if (!local || local.length === 0) {
    console.log('❌ Missing local part (before @)');
    return false;
  }
  
  // Domain part (after @) validation  
  if (!domain || domain.length === 0) {
    console.log('❌ Missing domain part (after @)');
    return false;
  }
  
  // Domain MUST contain at least one dot
  if (!domain.includes('.')) {
    console.log('❌ Domain must contain at least one dot');
    return false;
  }
  
  // Domain must not start or end with dot
  if (domain.startsWith('.') || domain.endsWith('.')) {
    console.log('❌ Domain cannot start or end with dot');
    return false;
  }
  
  // Domain must have something after the last dot (TLD)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    console.log('❌ Invalid TLD:', tld);
    return false;
  }
  
  // Basic character validation (simplified but effective)
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    console.log('❌ Failed regex test');
    return false;
  }
  
  console.log('✅ Email validation passed');
  return true;
};

// Test problematic emails
const testEmails = ['a', 'eee@g', '@', 'user@example.com', 'valid@test.co'];

console.log('\\n🧪 TESTING EMAIL VALIDATION:');
testEmails.forEach(email => {
  const result = window.validateEmail(email);
  console.log(\`Test "\${email}": \${result ? '✅ VALID' : '❌ INVALID'}\`);
});
`;

eval(script);