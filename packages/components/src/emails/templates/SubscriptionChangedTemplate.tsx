import {
  Container,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";
import { EmailWrapper } from "../EmailWrapper";

interface SubscriptionChangedTemplateProps {
  project: {
    id: number;
    name: string;
  };
}

export default function SupscriptionChangedTemplate({
  project,
}: Readonly<SubscriptionChangedTemplateProps>) {
  return (
    <EmailWrapper
      preview={<Preview>Your subscription has been updated.</Preview>}
    >
      <Container className="mt-16">
        <Img
          src="https://d3485o3p54n14c.cloudfront.net/logo_black.png"
          alt="logo"
          width={170}
          className="mx-auto"
        />
      </Container>
      <Container className="mt-10 rounded-[8px] border border-solid border-[#191B1F] text-center text-sm">
        <Section className="my-8">
          <Text>
            Your subscription for <strong>{project.name}</strong> has been
            changed.
          </Text>
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

SupscriptionChangedTemplate.PreviewProps = {
  project: {
    id: 1,
    name: "Example Project",
  },
} satisfies SubscriptionChangedTemplateProps;
