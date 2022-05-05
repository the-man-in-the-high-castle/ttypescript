export interface CompilerOptions {
    before: boolean;
    prepend: boolean;
    outFileDir?: string;
}

export function loadOptions() {
    const options: CompilerOptions = { before: false, prepend: false };

    if (popArg('--before')) {
        options.before = true;

        if (popArg('--prepend')) {
            options.prepend = true;
        }
    }
    options.outFileDir = popArgValue('--outFileDir');

    return options;

    function popArg(arg: string): boolean {
        if (process.argv.some((a) => a === arg)) {
            process.argv = process.argv.filter((a) => a !== arg);
            return true;
        }
        return false;
    }

    function popArgValue(arg: string): string | undefined {
        const index = process.argv.findIndex((a) => a.startsWith(arg));

        if (index >= 0) {
            const result = process.argv[index + 1];
            process.argv = process.argv.filter((a, i) => i !== index && i !== index + 1);
            console.log('ofd', process.argv);
            return result;
        }
    }
}
