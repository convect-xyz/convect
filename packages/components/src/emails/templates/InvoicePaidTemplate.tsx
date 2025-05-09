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

interface InvoicePaidTemplateProps {
  project: {
    id: number;
    name: string;
  };
  amount: {
    value: number;
    currency: string;
  };
}

export default function InvoicePaidTemplate({
  project,
  amount,
}: Readonly<InvoicePaidTemplateProps>) {
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
            We've received your payment for <strong>{project.name}</strong>.
            Your invoice is attached.
          </Text>
          <Text>
            Amount Paid:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: amount.currency,
            }).format(amount.value / 100)}
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

InvoicePaidTemplate.PreviewProps = {
  project: {
    id: 1,
    name: "Example Project",
  },
  amount: {
    value: 100,
    currency: "USD",
  },
} satisfies InvoicePaidTemplateProps;
