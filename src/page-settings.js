const SIZES = { A4: [11906 / 1440, 16838 / 1440], Letter: [8.5, 11] };
export function readPageSettings(section) {
  const setup = section.pageSetup || {};
  const dimensions = [setup.width, setup.height].sort((a, b) => a - b);
  const paper = Object.keys(SIZES).find(name => SIZES[name].every((value, index) => Math.abs(value - dimensions[index]) < 2 / 1440)) || 'current';
  return { paper, orientation: setup.orientation || (setup.width > setup.height ? 'landscape' : 'portrait') };
}
export function pageSetupPatch(section, paper, orientation) {
  const initial = readPageSettings(section);
  if ((paper === 'current' || initial.paper === paper) && initial.orientation === orientation) return null;
  const setup = section.pageSetup || {};
  const dimensions = paper === 'current' || paper === initial.paper ? [setup.width, setup.height] : SIZES[paper];
  if (!dimensions?.every(value => Number.isFinite(value) && value > 0)) throw new Error('Cannot read the current paper dimensions.');
  const [short, long] = [...dimensions].sort((a, b) => a - b);
  return { width: orientation === 'landscape' ? long : short, height: orientation === 'landscape' ? short : long, orientation };
}
