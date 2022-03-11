export function loadOptions() {
    const options = { before: false, prepend: false };

    if (popArg('--before')) {
        options.before = true;

        if (popArg('--prepend')) {
            options.prepend = true;
        }
    }
    return options;

    function popArg(arg: string): boolean {
        if (process.argv.some((a) => a === arg)) {
            process.argv = process.argv.filter((a) => a !== arg);
            return true;
        }
        return false;
    }
}
