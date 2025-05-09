import { getAppHostname } from "@convect-xyz/lib";
import {
  Container,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";
import { EmailButton } from "../components/EmailButton";
import { EmailWrapper } from "../EmailWrapper";

interface InvoiceOverdueTemplateProps {
  project: {
    id: number;
    name: string;
  };
  amount: {
    value: number;
    currency: string;
  };
}

export default function InvoiceOverdueTemplate({
  project,
  amount,
}: Readonly<InvoiceOverdueTemplateProps>) {
  return (
    <EmailWrapper preview={<Preview>Your invoice is overdue.</Preview>}>
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
            Your invoice for <strong>{project.name}</strong> is overdue. Please
            update your payment method to avoid any disruption to your service.
          </Text>
          <Text>
            Amount Due:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: amount.currency,
            }).format(amount.value / 100)}
          </Text>
          <EmailButton
            className="mt-6"
            href={`${getAppHostname()}/projects/${project.id}/settings/billing`}
          >
            Update Payment Method
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

InvoiceOverdueTemplate.PreviewProps = {
  project: {
    id: 1,
    name: "Example Project",
  },
  amount: {
    value: 100,
    currency: "USD",
  },
} satisfies InvoiceOverdueTemplateProps;
