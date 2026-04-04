export function printOutput(data: unknown, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}
