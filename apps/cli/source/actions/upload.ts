import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

type UploadOutputsOptions = {outfile: string; outmanifest: string; project: string, handlerName: string}

export async function uploadOutputs( options: UploadOutputsOptions ) {
  const { outfile, outmanifest, project, handlerName} = options;

  const apiKey = process.env['CONVECT_API_KEY'];
  if(!apiKey) {
    throw new Error('API Key is not set. Did you set it with `CONVECT_API_KEY=...`?')
  }

  const bodyFormData = new FormData();
  bodyFormData.append('mode', 'init')
  bodyFormData.append('project', project);
  bodyFormData.append('handlerName', handlerName);
  bodyFormData.append('handler', fs.readFileSync(outfile));
  bodyFormData.append('manifest', fs.readFileSync(outmanifest));
  bodyFormData.append('override', 'true');
  bodyFormData.append('node', '81457');

  try {
    await axios
      .post('http://localhost:3000/api/cli/deployments', bodyFormData, {
        headers: {'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${apiKey}`},
      });
  } catch(e: any) {
    console.log(e)
    throw new Error(e.response?.data.message ?? "An unexpected error occurred")
  }
}
