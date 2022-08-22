const chunkString = (str, length) => {
	return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

const largeFile = {
	base64: '', // your base64
	type: '',
}

// chunk image / file into smaller pieces of 20kbyte
const file_chunks = chunkString(largeFile.base64, 1024*10);

// create promise array
const encrypt_promises = file_chunks.map(chunk => SEA.encrypt(chunk, user._.sea));

// encrypt promises
const encrypted_chunks = await Promise.all(encrypt_promises);

// write chunks, either to CDN, S3, or GUN (large file so take care in GUN!)

// emulator educator
// ASIC GPUs

