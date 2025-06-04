import { SessionPreset } from "@/model/Session/SessionTypes";

const customPreset: SessionPreset = {
    key: 'custom',
    label: 'Custom',
}

function usePresets(): SessionPreset[] {
    const presets: SessionPreset[] = [
        {
            key: '25',
            label: '25m',
            minutes: 25
        },
        {
            key: '50',
            label: '50m',
            minutes: 50
        },
        {
            key: '75',
            label: '75m',
            minutes: 75
        },
        {
            key: '100',
            label: '100m',
            minutes: 100
        },
        customPreset,
    ];

    return presets;
}

export { usePresets, customPreset }
