import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

type UploadOutputsOptions =
	| {
			mode: 'init';
			outfile: string;
			outmanifest: string;
			project: string;
			handlerName: string;
	  }
	| {
			mode: 'update';
			project: string;
			handlerName: string;
			outfile: string;
	  };

export async function uploadOutputs(options: UploadOutputsOptions) {
	const {outfile, project, handlerName} = options;

	const apiKey = process.env['CONVECT_API_KEY'];
	if (!apiKey) {
		throw new Error(
			'API Key is not set. Did you set it with `CONVECT_API_KEY=...`?',
		);
	}

	const bodyFormData = new FormData();
	bodyFormData.append('mode', options.mode);
	bodyFormData.append('project', project);
	bodyFormData.append('handlerName', handlerName);
	bodyFormData.append('handler', fs.readFileSync(outfile));
	if (options.mode === 'init') {
		bodyFormData.append('manifest', fs.readFileSync(options.outmanifest));
	}
	bodyFormData.append('override', 'true');
	bodyFormData.append('node', '81457');

	try {
		await axios.post(
			'http://localhost:3000/api/cli/deployments',
			bodyFormData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${apiKey}`,
				},
			},
		);
	} catch (e: any) {
		throw new Error(e.response?.data.message ?? 'An unexpected error occurred');
	}
}
