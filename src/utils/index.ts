import {
  DeviceSettingsInterface,
  GlobalSettingsInterface,
  SceneSettingsInterface,
} from './interface'

export function isGlobalSettingsSet(
  settings: GlobalSettingsInterface | unknown
): settings is GlobalSettingsInterface {
  return (settings as GlobalSettingsInterface).accessToken !== undefined
}

export function isDeviceSetting(
  settings: DeviceSettingsInterface | unknown
): settings is DeviceSettingsInterface {
  return (settings as DeviceSettingsInterface).deviceId !== undefined
}

export function isSceneSetting(
  settings: SceneSettingsInterface | unknown
): settings is SceneSettingsInterface {
  return (settings as SceneSettingsInterface).sceneId !== undefined
}

interface FetchAPI {
  body?: BodyInit
  endpoint: string
  method: string
  accessToken: string
}

export async function fetchApi<T>({ body, endpoint, method, accessToken }: FetchAPI): Promise<T> {
  return await (
    await fetch(`https://api.smartthings.com/v1${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    })
  ).json()
}

export interface SelectElement {
  id?: string
  name?: string
}
interface AddSelectOption {
  select: HTMLSelectElement
  element: SelectElement
}

export const addSelectOption = ({ select, element }: AddSelectOption): void => {
  if (element.id && element.name) {
    const option = document.createElement('option')
    option.value = element.id
    option.text = element.name.slice(0, 30) // limit to 30 char to avoid display bug in the PI
    select.add(option)
  }
}


// This function converts HEX to Hue, Hue Percent, Saturation (SmartThings uses HueP-Saturation)
export const hexToHS = (hex: string): {h: number, hp: number, s: number} =>  {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16); 


  r /= 255, g /= 255, b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max == min) {
    return { h: 0, hp: 0, s: 0 };
  } else {
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;

    const finalH = h * 360;
    const percentH = Math.round((finalH / 360) * 100);
    return { h: finalH, hp: percentH, s: s * 100 };
  }
}