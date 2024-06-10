import { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function ContactDialog(props: { trigger?: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {props.trigger ?? <Button variant="outline">Contact Us</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogDescription>
            You can contact us at{" "}
            <a
              href="mailto:support@convect.xyz"
              className="font-medium underline underline-offset-2"
            >
              support@convect.xyz
            </a>{" "}
            for any inquiries.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
