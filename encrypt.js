const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('1. Generating RSA-OAEP 2048-bit Key Pair...');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
});

function encryptFile(inputPath, outputPath) {
    const aesKey = crypto.randomBytes(32); 
    const iv = crypto.randomBytes(12);

    const rawData = fs.readFileSync(inputPath, 'utf8');
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encryptedData = cipher.update(rawData, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    const encryptedAesKey = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
    }, aesKey).toString('base64');

    const payload = {
        encryptedAesKey: encryptedAesKey, 
        iv: iv.toString('base64'),        
        authTag: authTag,                 
        encryptedData: encryptedData      
    };

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
    console.log(`Encrypted: ${inputPath} -> ${outputPath}`);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.json') && !file.endsWith('.enc.json') && file !== 'manifest.json') {
            const outputPath = fullPath.replace(/\.json$/, '.enc.json');
            encryptFile(fullPath, outputPath);
        }
    }
}

console.log('2. Encrypting all quiz data files...');
processDirectory('./data');

console.log('\n======================================================');
console.log('✅ ENCRYPTION COMPLETE.');
console.log('Writing Private Key to private.jwk.json for agent reference...');
console.log('======================================================\n');
fs.writeFileSync('private.jwk.json', JSON.stringify(privateKey, null, 2));
console.log('Private key saved to private.jwk.json');
