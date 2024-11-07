import { DeviceSettingsInterface, GlobalSettingsInterface } from "../utils/interface";
import { KeyDownEvent, KeyUpEvent, SDOnActionEvent, StreamDeckAction, StateType, TargetType } from "streamdeck-typescript";
import { fetchApi, hexToHS, isGlobalSettingsSet } from "../utils/index";

import { DeviceStatus } from "@smartthings/core-sdk";
import { Smartthings } from "../smartthings-plugin";

export class DeviceAction extends StreamDeckAction<Smartthings, DeviceAction> {
  constructor(
    public plugin: Smartthings,
    private actionName: string
  ) {
    super(plugin, actionName);
  }

  private actualColor: string;

  @SDOnActionEvent("keyDown")
  public async onKeyDown(eventData: KeyDownEvent<DeviceSettingsInterface>): Promise<void> {
    this.runAction(eventData);
    // const globalSettings = this.plugin.settingsManager.getGlobalSettings<GlobalSettingsInterface>();
  }

  @SDOnActionEvent("keyUp")
  public async onKeyUp({ context, payload }: KeyUpEvent<DeviceSettingsInterface>): Promise<void> {
    // const globalSettings = this.plugin.settingsManager.getGlobalSettings<GlobalSettingsInterface>();
  }

  private async runAction({ context, payload }: KeyDownEvent<DeviceSettingsInterface>): Promise<void> {
    const globalSettings = this.plugin.settingsManager.getGlobalSettings<GlobalSettingsInterface>();

    if (isGlobalSettingsSet(globalSettings)) {
      const token = globalSettings.accessToken;
      const deviceId = payload.settings.deviceId;

      const deviceStatus = await this.getDeviceStatus(deviceId, token);

      if (
        deviceStatus.components?.main.switch === undefined &&
        deviceStatus.components?.main.doorControl === undefined
      ) {
        console.warn("Only switch devices and Garage Doors are supported at the moment !");
        return;
      }

      const behavior = payload.settings.behaviour;
      const mainComponents = deviceStatus.components.main; // Object

      if ("switch" in mainComponents && behavior === "toggle") {
        const isActive = mainComponents.switch.switch.value === "on";
        await this.toggleDevice(deviceId, token, isActive);
        this.plugin.setState(isActive ? StateType.OFF : StateType.ON, context);
      }
      if ("switchLevel" in mainComponents && behavior === "more") {
        const nextLevel = ((mainComponents.switchLevel.level.value as number) += 10);
        await this.setSwitchLevel(deviceId, token, nextLevel > 100 ? 100 : nextLevel);
      }
      if ("switchLevel" in mainComponents && behavior === "less") {
        const prevLevel = ((mainComponents.switchLevel.level.value as number) -= 10);
        await this.setSwitchLevel(deviceId, token, prevLevel < 0 ? 0 : prevLevel);
      }
      if ("colorControl" in deviceStatus.components?.main && behavior === "colors") {
        // Testing Colors: #FF5733, #fffb03, #ff0303, #0326ff, #f003ff
        const colorsSettings = payload.settings.colors;
        if (!colorsSettings) {
          return;
        }

        let newColorIndex = 0;
        for (let i = 0; i < colorsSettings.length; i++) {
          if (colorsSettings[i] === this.actualColor) {
            newColorIndex = (i + 1) % colorsSettings.length;
            break;
          }
        }
        const newColor = colorsSettings[newColorIndex];
        await this.setColor(deviceId, token, {
          colorHex: newColor,
          level: mainComponents.switchLevel.level.value as number,
        });
        // Set Icon Color
        const svg = this.getSVGImageColor(newColor);
        const icon = `data:image/svg+xml;base64,${btoa(svg)}`;
        this.plugin.setImageFromUrl(icon, context, TargetType.HARDWARE)
      }
      if ("doorControl" in deviceStatus.components?.main && behavior === "toggle") {
        const isActive = mainComponents.doorControl.door.value === "open";
        await this.toggleDoor(deviceId, token, isActive);
      }
    }
  }

  private async getDeviceStatus(deviceId: string, token: string): Promise<DeviceStatus> {
    return await fetchApi<DeviceStatus>({
      endpoint: `/devices/${deviceId}/status`,
      method: "GET",
      accessToken: token,
    });
  }

  private async toggleDevice(deviceId: string, token: string, isActive: boolean): Promise<void> {
    await fetchApi({
      endpoint: `/devices/${deviceId}/commands`,
      method: "POST",
      accessToken: token,
      body: JSON.stringify([
        {
          capability: "switch",
          command: isActive ? "off" : "on",
        },
      ]),
    });
  }

  private async setSwitchLevel(deviceId: string, token: string, level: number): Promise<void> {
    await fetchApi({
      endpoint: `/devices/${deviceId}/commands`,
      method: "POST",
      accessToken: token,
      body: JSON.stringify([
        {
          capability: "switchLevel",
          command: "setLevel",
          arguments: [level],
        },
      ]),
    });
  }

  private async toggleDoor(deviceId: string, token: string, isActive: boolean): Promise<void> {
    await fetchApi({
      endpoint: `/devices/${deviceId}/commands`,
      method: "POST",
      accessToken: token,
      body: JSON.stringify([
        {
          capability: "doorControl",
          command: isActive ? "close" : "open",
        },
      ]),
    });
  }
  private async setColor(deviceId: string, token: string, data: { colorHex: string; level: number }): Promise<void> {
    this.actualColor = data.colorHex;
    const finalColor = hexToHS(data.colorHex);
    await fetchApi({
      endpoint: `/devices/${deviceId}/commands`,
      method: "POST",
      accessToken: token,
      body: JSON.stringify([
        {
          capability: "colorControl",
          command: "setColor",
          arguments: [
            {
              hue: finalColor.hp,
              saturation: finalColor.s,
              //hex: data.colorHex,
              level: data.level,
              switch: "on",
            },
          ],
        },
      ]),
    });
  }


  private getSVGImageColor(hexColor: string) {
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="150" viewBox="0 0 512 512" height="150"
    xmlns:v="https://vecta.io/nano">
    <path
        opacity="0"
        d="M343 513H1.042V1.104h511.792V513H343M125.952 231.615c7.465 12.077 14.369 24.548 22.522 36.141 13.258 18.855 22.633 38.776 22.602 62.399-.016 12.533 11.022 23.892 24.115 23.87l121.998.156c13.901.173 26.966-12.213 25.9-25.861-.264-3.374.579-6.835.905-10.256 1.412-14.816 7.223-28.077 15.018-40.45 8.358-13.267 18.018-25.758 25.79-39.342 15.789-27.594 22.604-57.255 18.29-89.211-2.405-17.815-7.577-34.577-16.115-50.362-9.908-18.317-22.919-33.885-39.402-46.757-23.999-18.74-51.345-28.366-81.347-30.857-15.321-1.272-30.658.403-45.458 4.155-24.027 6.09-45.46 17.682-63.828 34.428-13.258 12.087-23.851 26.414-31.863 42.426-7.402 14.792-13.1 30.365-13.942 47.05-.688 13.633-1.368 27.475.217 40.958 1.69 14.375 7.351 27.973 14.599 41.513m188.359 204.386c-38.633 0-77.267.059-115.9-.039-10.656-.027-16.496 7.696-14.066 15.406 1.733 5.499 4.129 11.092 7.496 15.72 14.335 19.701 34.644 28.922 58.351 30.795 17.839 1.409 34.952-1.982 50.544-11.235 12.741-7.561 22.355-17.881 27.965-31.841 4.149-10.323-1.754-19.239-14.39-18.806M239.5 378c-14.647 0-29.302.3-43.938-.095-11.709-.316-17.978 8.553-18.449 17.521-.512 9.75 8.045 17.561 18.453 17.566l123.333-.003c9.723-.006 18.579-8.242 17.939-17.539-.679-9.875-7.016-17.583-17.945-17.508L239.5 378z" />
    <path fill="${hexColor}"
        d="M125.724 231.306c-7.02-13.231-12.681-26.829-14.371-41.204-1.585-13.483-.905-27.325-.217-40.958.842-16.685 6.54-32.258 13.942-47.05 8.012-16.012 18.605-30.339 31.863-42.426 18.368-16.746 39.801-28.338 63.828-34.428 14.8-3.751 30.137-5.426 45.458-4.155 30.002 2.49 57.349 12.117 81.347 30.857 16.483 12.871 29.494 28.44 39.402 46.757 8.539 15.785 13.71 32.546 16.115 50.362 4.314 31.956-2.501 61.617-18.29 89.211-7.773 13.584-17.432 26.075-25.79 39.342-7.795 12.373-13.606 25.633-15.018 40.45-.326 3.421-1.169 6.882-.905 10.256 1.066 13.647-11.999 26.034-25.9 25.861l-121.998-.156c-13.092.022-24.131-11.337-24.115-23.87.031-23.623-9.344-43.544-22.602-62.399-8.152-11.593-15.057-24.064-22.75-36.45z" />
    <path
        d="M314.783 436.001c12.164-.433 18.067 8.483 13.918 18.806-5.61 13.96-15.224 24.28-27.965 31.841-15.592 9.253-32.705 12.644-50.544 11.235-23.706-1.872-44.015-11.094-58.351-30.795-3.368-4.628-5.763-10.221-7.496-15.72-2.43-7.711 3.41-15.433 14.066-15.406l116.372.039zM240 378l78.893-.058c10.929-.075 17.266 7.633 17.945 17.508.639 9.297-8.216 17.534-17.939 17.539l-123.333.003c-10.409-.004-18.965-7.816-18.453-17.566.471-8.968 6.74-17.837 18.449-17.521 14.636.395 29.291.095 44.438.095z"
        fill="#a59d93" />
</svg>
`;
}

}
