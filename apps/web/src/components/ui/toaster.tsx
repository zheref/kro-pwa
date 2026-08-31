"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"
import { FaInfoCircle, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  

  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => {
          const leftIcon = () => {
            if (toast.type === "loading") {
              return <Spinner size="sm" color="blue.solid" />
            } else if (toast.type === "info") {
              return <FaInfoCircle />
            } else if (toast.type === "success") {
              return <FaCheckCircle />
            } else if (toast.type === "error") {
              return <FaExclamationCircle />
            }
            return <Toast.Indicator />
          };

          return (
            <Toast.Root width={{ md: "sm" }} padding={4} alignItems="center" justifyContent="center" borderRadius="4xl">
              {leftIcon()}
              <Stack gap={0} flex="1" maxWidth="100%">
                {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
                {toast.description && (
                  <Toast.Description fontSize="12px">{toast.description}</Toast.Description>
                )}
              </Stack>
              {toast.action && (
                <Toast.ActionTrigger paddingX={3} paddingY={0} borderRadius="4xl">{toast.action.label}</Toast.ActionTrigger>
              )}
              {toast.meta?.closable && <Toast.CloseTrigger />}
            </Toast.Root>
          )
        }}
      </ChakraToaster>
    </Portal>
  )
}
