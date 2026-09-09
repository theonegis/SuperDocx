import React from 'react';

export function FontPicker({label, value, fonts, mixed, emptyLabel, disabled, autoFocus, onChange}) {
  const options = [...new Set([value, ...fonts].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return <label className="field-label">{label}<select autoFocus={autoFocus} disabled={disabled} aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{mixed || emptyLabel}</option>
    {options.map(name => <option key={name} value={name}>{name}</option>)}
  </select></label>;
}
