export async function hashFileName(fileName: string) {
	return Array.from(
		new Uint8Array(
			await crypto.subtle.digest('SHA-1', new TextEncoder().encode(fileName)),
		),
		byte => byte.toString(16).padStart(2, '0'),
	).join('');
}
