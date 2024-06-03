import axios from 'axios';
import FormData from 'form-data';

type UploadOutputsOptions = {
	project: string;
	handlerName: string;
};

export async function checkHandler(options: UploadOutputsOptions) {
	const apiKey = process.env['CONVECT_API_KEY'];

	const bodyFormData = new FormData();
	bodyFormData.append('project', options.project);
	bodyFormData.append('handlerName', options.handlerName);

	try {
		return await axios
			.post('http://localhost:3000/api/cli/check-handler', bodyFormData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${apiKey}`,
				},
			})
			.then(r => r.data.exists as boolean);
	} catch (e: any) {
		throw new Error(e.response?.data.message ?? 'An unexpected error occurred');
	}
}
