import { CreateEmailOptions, Resend } from "resend";
import { env } from "../env";

export const resend = new Resend(env.RESEND_API_KEY);

export const sendNoReply = async (
  options: Omit<CreateEmailOptions, "from"> & {
    react?: React.ReactNode;
  }
) => {
  return await resend.emails.send({
    ...options,
    from: "Convect <no-reply@convect.xyz>",
  } as any);
};
