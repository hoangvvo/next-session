const parseToMs = (str) => {
  if (typeof str === 'number') return str;
  let miliseconds = str.search(/[a-zA-Z]+/) === -1 ? parseInt(str, 10) : 0;
  const years = str.match(/(\d+)(?=\s*year)/);
  const months = str.match(/(\d+)(?=\s*month)/);
  const days = str.match(/(\d+)(?=\s*day)/);
  const hours = str.match(/(\d+)(?=\s*hour)/);
  const minutes = str.match(/(\d+)(?=\s*minute)/);
  const seconds = str.match(/(\d+)(?=\s*second)/);
  if (years) miliseconds += parseInt(years[1], 10) * 365 * 24 * 60 * 60 * 1000;
  if (months) miliseconds += parseInt(months[1], 10) * 30 * 24 * 60 * 60 * 1000;
  if (days) miliseconds += parseInt(days[1], 10) * 24 * 60 * 60 * 1000;
  if (hours) miliseconds += parseInt(hours[1], 10) * 60 * 60 * 1000;
  if (minutes) miliseconds += parseInt(minutes[1], 10) * 60 * 1000;
  if (seconds) miliseconds += parseInt(seconds[1], 10) * 1000;
  return miliseconds;
};
//  eslint-disable-next-line import/prefer-default-export
export { parseToMs };
