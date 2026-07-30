"use client";

import { Button, Spinner, type ButtonProps } from "@heroui/react";
import { ReactNode } from "react";

interface PendingButtonProps extends Omit<ButtonProps, "children"> {
  children: ReactNode;
}

/**
 * HeroUI v3 dropped the built-in Button spinner (v2's `isLoading`), so every
 * submit button has to render one itself. This keeps that boilerplate in one place.
 */
const PendingButton: React.FC<PendingButtonProps> = ({ children, ...rest }) => (
  <Button {...rest}>
    {({ isPending }) => (
      <>
        {isPending && <Spinner color="current" size="sm" />}
        {children}
      </>
    )}
  </Button>
);

export default PendingButton;
