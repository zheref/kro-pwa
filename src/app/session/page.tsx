'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
    Center,
    VStack,
    Button,
    Input,
    HStack,
    Group,
    IconButton,
    Field,
    Menu,
    defineStyle, Portal, Box,
    Alert,
} from '@chakra-ui/react'
import { LuPlay } from 'react-icons/lu'
import { useSession } from '@/hooks/useSession'
import { seconds, secondsFromMinutes } from '@/utils/durations'
import {FaPlay, FaPause, FaStop, FaCheck} from 'react-icons/fa'
import { toaster } from "@/components/ui/toaster"
import { customPreset, usePresets } from '@/hooks/usePresets'
import { SessionConfig, standardRestDurationFrom } from '@/model/Session/SessionConfig'
import { FragmentFocusStatus, SessionStatusFocused } from '@/model/Session/SessionTypes'
import {FaXmark} from "react-icons/fa6"
import {LoginWithGoogleButton} from "@/components/LoginWithGoogle"
import SessionDial from "@/app/session/SessionDial";

const floatingStyles = defineStyle({
    pos: "absolute",
    bg: {
        base: "gray.100",
        _dark: "gray.900"
    },
    px: "0.5",
    top: "-3",
    insetStart: "2",
    fontWeight: "normal",
    pointerEvents: "none",
    transition: "position",
    _peerPlaceholderShown: {
        color: "fg.muted",
        top: "2.5",
        insetStart: "3",
    },
    _peerFocusVisible: {
        color: "fg",
        top: "-3",
        insetStart: "2",
    },
})

/**
 * The main session page.
 * Used to present session feature within the app navigation structure.
 * @constructor
 */
export default function SessionPage() {
  // #region State
  const presets = usePresets()
  const [selectedPreset, setSelectedPreset] = useState(presets[0])

  const onSessionFinished = useCallback(() => {
    toaster.create({
        title: 'Session ended',
        description: 'You did it!',
        type: 'success',
        duration: seconds(30),
        action: {
            label: 'Done',
            onClick: () => {
                toaster.dismiss()
            }
        }
    })
  }, [])

  
  const { state, actions } = useSession({}, onSessionFinished)
  const [isIntentionFocused, setIsIntentionFocused] = useState(false)
  const { userDidUpdateTargetConfig } = actions
  
  const inputRef = useRef<HTMLInputElement>(null)

  // #region Computed State

  const isRunning = useMemo(() => {
    return state.status instanceof SessionStatusFocused
        && state.status.status === FragmentFocusStatus.running
  }, [state.status])

  const enabledToConfirmIntention = useMemo(() => {
    const value = state.intention
    return isIntentionFocused && value.length > 0
  }, [isIntentionFocused, state.intention])

  // #endregion

  // #region Side Effects

  // 3. Handle key presses
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (isIntentionFocused) {
          inputRef.current?.blur()
        } else if (!isRunning) {
          inputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isRunning, isIntentionFocused])

  // #endregion

  // #region Handlers

  /**
    * Handles the user dragging the dial.
    * @param seconds - The duration of the dial in seconds.
    */
  const userDidDragDial = (seconds: number) => {
    if (seconds > 0) {
      const minutes = secondsFromMinutes(seconds)
      
      const matchingPreset = presets.find(preset => preset.minutes === minutes)
        if (matchingPreset) {
          setSelectedPreset(matchingPreset)
        } else {
          setSelectedPreset(customPreset)
        }

        userDidUpdateTargetConfig(
          new SessionConfig(seconds, standardRestDurationFrom(seconds))
        )
      }
  }

    /**
     * Handles the change event for an intention input field.
     * Triggered when the value of the associated input field changes,
     * retrieves the updated value from the event target and invokes the
     * `updateIntention` action with the new value.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event - The change event emitted by the input field.
     */
    const handleIntentionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        actions.updateIntention(value)
    }

    // #endregion

    const connectCalendarCard = useMemo(() => (
        !state.isCalendarConfigured && <Alert.Root alignItems="center" h="70px" justifyContent="space-between" padding={3} status="info" variant="surface">
            <HStack>
                <Alert.Indicator />
                <Alert.Title>
                    You can connect your Google Account to record your sessions in your calendar.
                </Alert.Title>
            </HStack>
            <LoginWithGoogleButton />
        </Alert.Root>
    ), [state.isCalendarConfigured])

    const intentionArea = (
        <VStack w="full"
                borderWidth={1}
                borderColor={isIntentionFocused ? 'blue.500' : 'transparent'}
                rounded="4xl">
            <Group attached
                   borderWidth={1}
                   borderColor={isIntentionFocused ? 'blue.500' : 'gray.300'}
                   rounded="4xl"
                   w="full"
            >
                <Field.Root h="43px">
                    <Input
                        ref={inputRef}
                        flex={1}
                        value={state.intention}
                        placeholder="Intention"
                        p={3}
                        borderWidth={0}
                        outline="none"
                        disabled={isRunning}
                        onFocus={() => setIsIntentionFocused(true)}
                        onBlur={() => setIsIntentionFocused(false)}
                        color={{
                            base: 'gray.900',
                            _dark: 'gray.100',
                        }}
                        _focus={{
                            outline: 'none',
                            boxShadow: 'none',
                            borderWidth: 0,
                            borderColor: 'transparent',
                        }}
                        _focusVisible={{
                            outline: 'none',
                            boxShadow: 'none',
                            borderWidth: 0,
                            borderColor: 'transparent',
                        }}
                        _active={{
                            outline: 'none',
                            boxShadow: 'none',
                            borderWidth: 0,
                            borderColor: 'transparent',
                        }}
                        onChange={handleIntentionChange}
                    />
                    {state.intention.length > 0 && (
                        <Field.Label color={{
                            base: 'gray.400',
                            _dark: 'gray.600',
                        }} css={floatingStyles}>
                            Intention
                        </Field.Label>
                    )}

                </Field.Root>
                {enabledToConfirmIntention && (
                    <Button h="43px" p={3} variant="solid" bg="blue.500" rounded="4xl">Confirm</Button>
                )}
            </Group>
        </VStack>
    )

  const renderControls = () => {
    if (state.status instanceof SessionStatusFocused) {
      return (
        <HStack gap={3} w="full" justifyContent="center">
            {state.status.status === FragmentFocusStatus.running ? (
                <IconButton variant="subtle" size="lg" rounded="full" onClick={actions.pauseSession}>
                    <FaPause />
                </IconButton>
            ) : (
                <IconButton 
                    bg="blue.500" 
                    variant="solid" 
                    size="lg" 
                    rounded="full" 
                    onClick={actions.resumeSession}
                >
                    <LuPlay />
                </IconButton>
            )}
            <Menu.Root>
                <Menu.Trigger asChild>
                    <IconButton variant="outline" size="lg" rounded="full">
                        <FaStop />
                    </IconButton>
                </Menu.Trigger>
                <Portal>
                    <Menu.Positioner>
                        <Menu.Content p={1} rounded="3xl">
                            <Menu.Item p={2} value="abort" rounded="3xl" onClick={actions.abortSession}>
                                <FaXmark />
                                <Box flex={1}>Abort</Box>
                            </Menu.Item>
                            <Menu.Item p={2} value="finish-early" rounded="3xl" onClick={actions.finishSession}>
                                <FaCheck />
                                <Box flex={1}>Finish Early</Box>
                            </Menu.Item>
                        </Menu.Content>
                    </Menu.Positioner>
                </Portal>
            </Menu.Root>
        </HStack>
      )
    } else {
        return (
            <HStack gap={3} w="full" justifyContent="center">
                <IconButton bg="blue.500" variant="solid" size="lg" rounded="full" onClick={() => {
                    actions.startSession()
                    toaster.create({
                        title: 'Session started',
                        description: 'Good luck!',
                        type: 'info',
                        action: {
                            label: 'Dismiss',
                            onClick: () => {
                                toaster.dismiss()
                            }
                        }
                    })
                }}>
                    <FaPlay />
                </IconButton>
            </HStack>
        )
    }
  }

  return (
      <VStack h="full" justifyContent="stretch" p={3}>
          {connectCalendarCard}
          <Center h="full">
              <VStack gap={10} w="400px" maxW="700px" maxH="600px" justifyContent="space-between" alignItems="center">
                  {intentionArea}
                  <SessionDial status={state.status}
                               targetConfig={state.targetConfig}
                               remainingDuration={state.remainingDuration}
                               timeRangeForDisplay={state.timeRangeForDisplay}
                               fragmentsCountForDisplay={state.fragmentsCountForDisplay}
                               isRunning={isRunning}
                               userDidDragDial={userDidDragDial}
                  />
                  {renderControls()}
              </VStack>
          </Center>
      </VStack>
  )
}