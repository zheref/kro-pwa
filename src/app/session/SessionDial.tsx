'use client'

import React, { useCallback } from 'react'
import { SessionStatus, SessionStatusFocused } from '@/model/Session/SessionTypes'
import DurationDial from '@/components/DurationDial'
import { Text, VStack } from '@chakra-ui/react'

/**
 * Props for the SessionDial component
 * @interface SessionDialProps
 * @property {SessionStatus} status - The current status of the session
 * @property {Object} targetConfig - Configuration for the session target
 * @property {number} targetConfig.duration - The target duration for the session
 * @property {number} remainingDuration - The remaining duration of the session
 * @property {string} timeRangeForDisplay - The time range to display
 * @property {string} fragmentsCountForDisplay - The count of fragments to display
 * @property {boolean} [isRunning] - Whether the session is currently running
 * @property {function} [userDidDragDial] - Callback for when the user drags the dial
 */
interface SessionDialProps {
    // Define any props you need for the SessionDial component
    status: SessionStatus
    targetConfig: {
        duration?: number
    }
    remainingDuration: number
    timeRangeForDisplay: string
    fragmentsCountForDisplay: string
    isRunning?: boolean

    // User Events
    userDidDragDial?: (duration: number) => void
}

/**
 * SessionDial component
 * Displays a dial for managing session duration and fragments.
 * @constructor
 * @param {SessionDialProps} props - The properties for the SessionDial component
 * @returns {JSX.Element} The rendered SessionDial component
 * @example
 * <SessionDial
 *     status={sessionStatus}
 *     targetConfig={{ duration: 3600 }}
 *     remainingDuration={1800}
 *     timeRangeForDisplay="00:30:00 - 01:30:00"
 *     fragmentsCountForDisplay="3 fragments"
 *     isRunning={true}
 *     userDidDragDial={(duration) => console.log('Dial dragged to:', duration)}
 * />
 * @see DurationDial for the dial component used within SessionDial
 * @see SessionStatus for the session status types
 * @see SessionStatusFocused for focused session status
 * @see SessionDialProps for the properties of the SessionDial component
 */
export default function SessionDial(
    {
        status,
        targetConfig,
        remainingDuration,
        timeRangeForDisplay,
        fragmentsCountForDisplay,
        isRunning = false,
        userDidDragDial = () => {},
    }: SessionDialProps
) {
    const userDidDragDialCallback = useCallback(userDidDragDial, [])

    return (
        <VStack gap={3}>
            {status instanceof SessionStatusFocused ? (
                <DurationDial
                    duration={targetConfig.duration ?? 0}
                    onDurationChange={userDidDragDialCallback}
                    isRunning={isRunning}
                />
            ) : (
                <DurationDial
                    duration={remainingDuration}
                    onDurationChange={userDidDragDialCallback}
                    isRunning={isRunning}
                />
            )}
            <VStack gap={1} minH="40px">
                <Text fontWeight="500" fontSize="12px" color={{
                    base: 'gray.600',
                    _dark: 'gray.400',
                }}>
                    {isRunning
                        ? timeRangeForDisplay
                        : timeRangeForDisplay}
                </Text>
                <Text fontWeight="500" fontSize="12px" color={{base: 'gray.600', _dark: 'gray.400'}}>
                    {fragmentsCountForDisplay}
                </Text>
            </VStack>
        </VStack>
    )
}