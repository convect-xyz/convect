import {
  Container,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { getAppHostname } from "~/lib/shared/utils";
import { EmailButton } from "./components/EmailButton";
import { EmailWrapper } from "./EmailWrapper";

interface InviteSentProps {
  inviteId: string;
  senderUsername: string;
  projectName: string;
}

export default function InviteSentTemplate({
  inviteId,
  senderUsername,
  projectName,
}: Readonly<InviteSentProps>) {
  return (
    <EmailWrapper
      preview={
        <Preview>
          You have been invited to join {projectName} by {senderUsername}.
        </Preview>
      }
    >
      <Container className="mt-16">
        <Img
          src="https://d3485o3p54n14c.cloudfront.net/logo_white.png"
          alt="logo"
          width={170}
          className="mx-auto"
        />
      </Container>
      <Container className="mt-10 rounded-[8px] border border-solid border-[#191B1F] bg-[#0d0d0d] text-center text-sm">
        <Section className="my-8">
          <Text>
            You have been invited to join <strong>{projectName}</strong> by{" "}
            <strong>{senderUsername}</strong>.
          </Text>

          <EmailButton
            className="mt-6"
            href={`${getAppHostname()}/invites/${inviteId}?accept=true`}
          >
            Accept Invite
          </EmailButton>
        </Section>
      </Container>
      <Container className="text-center">
        <Text className="text-[#8A8A8A]">
          Convect Technologies &copy; {new Date().getFullYear()} –{" "}
          <Link
            href="https://www.convect.xyz"
            className="text-[#8A8A8A] underline"
          >
            www.convect.xyz
          </Link>
        </Text>
      </Container>
    </EmailWrapper>
  );
}
