import { getReactQueryHelper } from "~/trpc/server";
import Main from "./Main";

type Props = {
  params: {
    functionId: string;
    projectId: string;
  };
};
export default async function Page({ params }: Props) {
  const helper = await getReactQueryHelper();

  await helper.functions.get.fetch({
    functionId: Number(params.functionId),
    projectId: Number(params.projectId),
  });

  return <Main />;
}
