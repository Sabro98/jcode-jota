export function windowPath(target: string): string {
    const from = '\\', to = '\\\\'
    const tmpTarget = target.split(from);
    // if (tmpTarget[0] === '') tmpTarget.splice(0, 1);
    tmpTarget.splice(0, 1);
    return tmpTarget.join(to);
}