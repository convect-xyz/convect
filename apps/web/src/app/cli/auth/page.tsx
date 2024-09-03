"use client";

import axios from "axios";
import { customAlphabet } from "nanoid";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

type Props = {
  searchParams: {
    code: string;
    redirect: string;
  };
};

const nanoid = customAlphabet("0123456789abcdef", 6);

export default function Auth(props: Props) {
  const { code, redirect } = props.searchParams;

  const {
    mutateAsync: createApiKey,
    isPending: isCreatingKey,
    isSuccess,
  } = api.apiKeys.createApiKey.useMutation({
    onSuccess: (data) => {
      axios.get(redirect, {
        params: {
          apiKey: data.token,
        },
      });
    },
  });

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Cli Authentication
            {!isSuccess && (
              <div className="mt-2">
                <p className="text-center text-sm font-light">
                  Please confirm the code below is the same as the one shown in
                  the terminal.
                </p>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <div className="grid gap-4">
              <div className="flex flex-col items-stretch gap-2">
                <div className="flex items-center justify-between gap-2">
                  {code.split("").map((char, index) => (
                    <span
                      key={index}
                      className="w-10 rounded-sm border bg-background p-2 text-center"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">Authenticated</div>
          )}
        </CardContent>
        <CardFooter>
          {!isSuccess && (
            <Button
              className="w-full"
              isLoading={isCreatingKey}
              onClick={() =>
                createApiKey({
                  name: `cli-${nanoid()}`,
                })
              }
            >
              Authenticate
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
