import * as fs from 'fs';

const pets: { [key: string]: { colors: string[]; states: string[] } } = {
    bulbasaur: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    ivysaur: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    venusaur: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    charmander: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    charmeleon: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    charizard: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
    dragonite: {
        colors: ['default'],
        states: [
            'idle',
            'walk',
        ]
    },
};

function checkGifFilenames(folder: string) {
    for (const pet in pets) {
        const allowedColors = pets[pet].colors;
        const allowedStates = pets[pet].states;
        if (!allowedColors) {
            console.error(`No colors found for pet "${pet}"`);
            return;
        }
        allowedColors.forEach((color) => {
            allowedStates.forEach((state) => {
                const filename = `${color}_${state}_8fps.gif`;
                const filePath = `${folder}/${pet}/${filename}`;
                if (!fs.existsSync(filePath)) {
                    // \x1b[31m is the ANSI escape code for red, and \x1b[0m resets the color back to the terminal's default.
                    console.error(
                        `\x1b[31mFile "${filePath}" does not exist.\x1b[0m`,
                    );
                    return false;
                } else {
                    console.log(`File "${filePath}" exists.`);
                }
            });
        });
    }
}

const mediaFolder = './media';
checkGifFilenames(mediaFolder);
