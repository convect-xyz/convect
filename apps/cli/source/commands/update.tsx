import {Spinner, StatusMessage, TextInput} from '@inkjs/ui';
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useMutationState,
} from '@tanstack/react-query';
import {Box} from 'ink';
import React, {useState} from 'react';
import {z} from 'zod';
import {bundleFile} from '../actions/bundle.js';
import {uploadOutputs} from '../actions/upload.js';

export const args = z.tuple([z.string()]);

type Props = {
	args: z.infer<typeof args>;
};

const queryClient = new QueryClient();

const bundleKey = ['bundle'];
const uploadKey = ['upload'];

export default function Update(props: Props) {
	return (
		<QueryClientProvider client={queryClient}>
			<Content {...props} />
		</QueryClientProvider>
	);
}

function Content(props: Props) {
	const [project, handlerName] = props.args[0].split('/');
	const [entrypoint, setEntrypoint] = useState<string>();

	const {mutateAsync: triggerUpload} = useMutation({
		mutationKey: uploadKey,
		mutationFn: uploadOutputs,
		throwOnError: false,
	});

	const {mutateAsync: triggerBundle} = useMutation({
		mutationKey: bundleKey,
		mutationFn: bundleFile,
		throwOnError: false,
		onSuccess(data) {
			if (!project) throw new Error('No Project');
			if (!handlerName) throw new Error('No Handler');
			triggerUpload({
				mode: 'update',
				project,
				handlerName,
				outfile: data.outfile,
			}).catch(() => {});
		},
	});

	return (
		<>
			<SetEntrypoint
				handlerName={handlerName}
				entrypoint={entrypoint}
				onSubmit={v => {
					setEntrypoint(v);
					triggerBundle({
						entrypoint: v,
					}).catch(() => {});
				}}
			/>
			<BundleState />
			<UploadState />
		</>
	);
}

function SetEntrypoint(props: {
	entrypoint?: string;
	handlerName?: string;
	onSubmit: (entrypoint: string) => void;
}) {
	if (!props.handlerName) return null;

	if (props.entrypoint) {
		return (
			<StatusMessage variant="success">
				Entrypoint: {props.entrypoint}
			</StatusMessage>
		);
	}

	return (
		<Box>
			<Spinner label="Handler path: " />
			<TextInput
				onSubmit={props.onSubmit}
				placeholder="Tell us the path to your ingestion handler"
			/>
		</Box>
	);
}

function BundleState() {
	const bundleState = useMutationState({
		filters: {
			mutationKey: bundleKey,
		},
	}).at(0);

	if (!bundleState) return <></>;

	if (bundleState.status === 'pending') {
		return <Spinner label="Bundling source code" />;
	}

	if (bundleState.status === 'success') {
		return <StatusMessage variant="success">Bundled source code</StatusMessage>;
	}

	return (
		<StatusMessage variant="error">{bundleState.error?.stack}</StatusMessage>
	);
}

function UploadState() {
	const uploadState = useMutationState({
		filters: {
			mutationKey: uploadKey,
		},
	}).at(0);

	if (!uploadState) return <></>;

	if (uploadState.status === 'pending') {
		return <Spinner label="Uploading source code" />;
	}

	if (uploadState.status === 'success') {
		return (
			<StatusMessage variant="success">Uploaded source code</StatusMessage>
		);
	}

	return (
		<StatusMessage variant="error">
			{uploadState.error?.message ?? 'Failed to upload source code'}
		</StatusMessage>
	);
}
