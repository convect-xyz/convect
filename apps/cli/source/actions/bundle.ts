import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import {encodeEventTopics} from 'viem';
import {hashFileName} from '../lib/utils.js';

export type BundleFileOptions = {
	entrypoint: string;
};

export async function bundleFile(options: BundleFileOptions) {
	const {entrypoint} = options;

	const hashedFileName = await hashFileName(path.basename(entrypoint));

	const outfile = path.join('.ingest', 'outputs', hashedFileName + '.js');
	const outmanifest = path.join('.ingest', 'outputs', hashedFileName + '.json');

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

	const all_log_configs = Object.values(pipeline).flatMap(
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
