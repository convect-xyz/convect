import axios from 'axios';
import * as esbuild from 'esbuild';
import FormData from 'form-data';
import fs from 'fs';
import { Text } from 'ink';
import path from 'path';
import React, { useEffect, useState } from 'react';
import { encodeEventTopics } from 'viem';
import { z } from 'zod';

export const args = z.tuple([
	z.enum(['new', 'update']),
	z.string(),
	z.string().transform(v => path.join(process.cwd(), v)),
]);

type Props = {
	args: z.infer<typeof args>;
};

async function hashFileName(fileName: string) {
	return Array.from(
		new Uint8Array(
			await crypto.subtle.digest('SHA-1', new TextEncoder().encode(fileName)),
		),
		byte => byte.toString(16).padStart(2, '0'),
	).join('');
}

export default function Upload({args}: Props) {
	const [state, setState] = useState<'bundling' | 'uploading' | undefined>(
		'bundling',
	);
	const mode = args[0];
	const identifier = args[1];
	const entrypoint = args[2];

	async function bundleFile() {
		const hashedFileName = await hashFileName(path.basename(entrypoint));
		const outfile = path.join('.ingest', 'outputs', hashedFileName + '.js');

		const outmanifest = path.join(
			'.ingest',
			'outputs',
			hashedFileName + '.json',
		);

		await esbuild.build({
			entryPoints: [entrypoint],
			minify: false,
			target: 'node10.4',
			platform: 'node',
			outfile: outfile,
			bundle: true,
		});

		const {
			default: {default: pipeline},
		} = await import(path.join(process.cwd(), outfile));

		const manifest = {
			log_configs: [] as Array<any>,
		};

		const all_log_configs = Object.values(pipeline.transactions).flatMap(
			(txConfig: any) => txConfig._logs,
		);

		const seen = new Set<string>();
		for (const log_config of all_log_configs) {
			let topics = encodeEventTopics({abi: [log_config._event]});
			let event_signature = topics.at(0)!.substring(2);
			let origin = log_config._origin;

			let identifier = event_signature + '-' + origin;

			if (seen.has(identifier)) continue;

			manifest.log_configs.push({
				address: origin,
				topics: [event_signature],
			});

			seen.add(identifier);
		}

		fs.writeFileSync(outmanifest, JSON.stringify(manifest));

		return {outfile, outmanifest};
	}

	async function uploadOutputs(opts: {outfile: string; outmanifest: string}) {
		var bodyFormData = new FormData();

		bodyFormData.append('mode', mode);
		bodyFormData.append('identifier', identifier);
		bodyFormData.append('handler', fs.readFileSync(opts.outfile));
		bodyFormData.append('manifest', fs.readFileSync(opts.outmanifest));

		await axios
			.post('http://localhost:3000/api/cli/deployments', bodyFormData, {
				headers: {'Content-Type': 'multipart/form-data'},
			})
			.catch(e => console.log(e.response.data));
	}

	async function start() {
		const outfile = await bundleFile();
		setState('uploading');
		await uploadOutputs(outfile);
		setState(undefined);
	}

	useEffect(() => {
		start();
	}, []);

	return (
		<>
			<Text color={state !== 'bundling' ? 'green' : ''}>
				{state === 'bundling' ? 'Bundling' : 'Bundled'}
			</Text>
			{state === 'uploading' && (
				<Text>
					{state === 'uploading' ? 'Uploading outputs' : 'Uploaded outputs'}
				</Text>
			)}
		</>
	);
}
