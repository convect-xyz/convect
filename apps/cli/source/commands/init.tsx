import {Select, Spinner, StatusMessage, TextInput} from '@inkjs/ui';
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useMutationState,
	useQuery,
} from '@tanstack/react-query';
import axios, {AxiosError} from 'axios';
import {Box} from 'ink';
import React, {useState} from 'react';
import {z} from 'zod';
import {bundleFile} from '../actions/bundle.js';
import {checkHandler} from '../actions/checkHandler.js';
import {uploadOutputs} from '../actions/upload.js';
import {getAuthHeaders} from '../lib/utils.js';

export const args = z.tuple([]);

type Props = {
	args: z.infer<typeof args>;
};

const queryClient = new QueryClient();

const bundleKey = ['bundle'];
const uploadKey = ['upload'];
const checkHandlerKey = ['check-handler'];

function useProjects() {
	return useQuery({
		queryKey: ['projects'],
		queryFn: async () => {
			try {
				return await axios
					.get('http://localhost:3000/api/cli/projects', {
						headers: getAuthHeaders(),
					})
					.then(r => r.data as {projects: string[]});
			} catch (e) {
				if (e instanceof AxiosError) {
					throw new Error(
						e.response?.data?.message ?? 'An unexpected error occurred',
					);
				}

				throw e;
			}
		},
	});
}

function useChains() {
	return useQuery({
		queryKey: ['chains'],
		queryFn: async () => {
			try {
				return await axios
					.get('http://localhost:3000/api/cli/chains', {
						headers: getAuthHeaders(),
					})
					.then(
						r =>
							r.data as {
								chains: {
									id: string;
									name: string;
								}[];
							},
					)
					.then(d => d.chains);
			} catch (e) {
				if (e instanceof AxiosError) {
					throw new Error(
						e.response?.data?.message ?? 'An unexpected error occurred',
					);
				}

				throw e;
			}
		},
	});
}

export default function Init(props: Props) {
	return (
		<QueryClientProvider client={queryClient}>
			<Content {...props} />
		</QueryClientProvider>
	);
}

function Content(_: Props) {
	const [project, setProject] = useState<string>();
	const [handlerName, setHandlerName] = useState<string>();
	const [chain, setChain] = useState<string>();
	const [entrypoint, setEntrypoint] = useState<string>();
	const [exists, setExists] = useState<boolean>();
	const [override, setOverride] = useState<boolean>();

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
			if (!project) throw new Error('Project name is not specified');
			if (!handlerName) throw new Error('Handler name is not specified');
			if (!chain) throw new Error('Chain is not specified');
			const getOverride = () => {
				if (!exists) return false;
				if (exists && override === undefined) {
					throw new Error('Override is not specified');
				}
				return override!;
			};

			triggerUpload({
				mode: 'init',
				project,
				handlerName,
				outfile: data.outfile,
				outmanifest: data.outmanifest,
				override: getOverride(),
				chain,
			}).catch(() => {});
		},
	});

	return (
		<>
			<SelectProject project={project} onSelect={setProject} />
			<SetHandlerName
				project={project}
				handlerName={handlerName}
				onSubmit={(handlerName, exists) => {
					setHandlerName(handlerName);
					setExists(exists);
				}}
			/>
			{exists && (
				<SetOverride
					override={override}
					project={project}
					handlerName={handlerName}
					onSubmit={setOverride}
				/>
			)}
			{project &&
				handlerName &&
				(!exists || (exists && override !== undefined)) && (
					<SelectChain chain={chain} onSelect={setChain} />
				)}
			{chain && (
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
			)}
			<BundleState />
			<UploadState />
		</>
	);
}

function SelectProject(props: {
	onSelect: (id: string) => void;
	project?: string;
}) {
	const {data: projects, error, isLoading} = useProjects();

	if (isLoading) {
		return <Spinner label="Fetching your projects" />;
	}

	if (error) {
		return <StatusMessage variant="error">{error.message}</StatusMessage>;
	}

	if (props.project) {
		return (
			<StatusMessage variant="success">
				Project Name ({props.project})
			</StatusMessage>
		);
	}

	return (
		<Box>
			<Spinner label="Select a project " />

			<Select
				options={projects?.projects.map(p => ({label: p, value: p})) ?? []}
				onChange={props.onSelect}
			/>
		</Box>
	);
}

function SelectChain(props: {onSelect: (id: string) => void; chain?: string}) {
	const {data: chains, error, isLoading} = useChains();

	if (isLoading) {
		return <Spinner label="Fetching your projects" />;
	}

	if (error) {
		return <StatusMessage variant="error">{error.message}</StatusMessage>;
	}

	if (props.chain) {
		return (
			<StatusMessage variant="success">
				Chain ({chains?.find(c => c.id === props.chain)!.name})
			</StatusMessage>
		);
	}

	return (
		<Box>
			<Spinner label="Select a chain " />

			<Select
				options={chains?.map(p => ({label: p.name, value: p.id})) ?? []}
				onChange={props.onSelect}
			/>
		</Box>
	);
}

function SetHandlerName(props: {
	project?: string;
	handlerName?: string;
	onSubmit: (name: string, exists: boolean) => void;
}) {
	const {mutateAsync: check} = useMutation({
		mutationKey: checkHandlerKey,
		mutationFn: checkHandler,
		throwOnError: false,
	});

	if (!props.project) return <></>;

	if (props.handlerName) {
		return (
			<StatusMessage variant="success">
				Handler Name: {props.handlerName}
			</StatusMessage>
		);
	}

	return (
		<Box>
			<Spinner label="Handler Name: " />
			<TextInput
				onSubmit={async v => {
					const exists = await check({
						project: props.project!,
						handlerName: v,
					});
					props.onSubmit(v, exists);
				}}
				placeholder="Only characters and hyphens allowed"
			/>
		</Box>
	);
}

function SetOverride(props: {
	project?: string;
	handlerName?: string;
	override?: boolean;
	onSubmit: (override: boolean) => void;
}) {
	if (!props.project || !props.handlerName) return <></>;

	if (props.override) {
		return (
			<Box>
				<StatusMessage variant="success">
					Handler '{props.handlerName}', already exists in '{props.project}'.
					Doing this will create a new version of your handler. Would you like
					to proceed? y
				</StatusMessage>
			</Box>
		);
	}

	return (
		<Box>
			<Spinner
				label={`Handler '${props.handlerName}', already exists in '${props.project}'. Doing this will create a new version of your handler. Would you like to proceed? `}
			/>
			<TextInput
				onSubmit={v => {
					if (v.toLowerCase() === 'y') {
						props.onSubmit(true);
					} else {
						process.exit(0);
					}
				}}
				placeholder="y/n"
			/>
		</Box>
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
