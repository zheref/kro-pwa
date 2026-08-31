
const START = 'sounds/start_ping.mp3'
const PROGRESS = 'sounds/progress_ding.mp3'
const SUCCESS = 'sounds/videogame_success.mp3'

function playSound(soundName: string): Promise<void> {
    const sound = new Audio(soundName)
    return sound.play()
}

function playStart(): Promise<void> {
    return playSound(START)
}

function playProgress(): Promise<void> {
    return playSound(PROGRESS)
}

function playSuccess(): Promise<void> {
    return playSound(SUCCESS)
}

export {
    playStart,
    playProgress,
    playSuccess
}