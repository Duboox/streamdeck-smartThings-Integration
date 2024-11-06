import { DeviceSettingsInterface, GlobalSettingsInterface } from "../utils/interface";
import { KeyDownEvent, KeyUpEvent, SDOnActionEvent, StreamDeckAction, StateType } from "streamdeck-typescript";
import { fetchApi, isGlobalSettingsSet } from "../utils/index";

import { DeviceStatus } from "@smartthings/core-sdk";
import { Smartthings } from "../smartthings-plugin";

export class DeviceAction extends StreamDeckAction<Smartthings, DeviceAction> {
  constructor(
    public plugin: Smartthings,
    private actionName: string
  ) {
    super(plugin, actionName);
  }

  @SDOnActionEvent("keyDown")
  public async onKeyDown(eventData: KeyDownEvent<DeviceSettingsInterface>): Promise<void> {
    this.runAction(eventData)
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

      const deviceStatus = await this.getDeviceStatus(deviceId, token)

      if (
        deviceStatus.components?.main.switch === undefined &&
        deviceStatus.components?.main.doorControl === undefined
      ) {
        console.warn("Only switch devices and Garage Doors are supported at the moment !");
        return;
      }

      if ("switch" in deviceStatus.components.main) {
        switch (payload.settings.behaviour) {
          case "toggle":
            const isActive = deviceStatus.components.main.switch.switch.value === "on";
            await this.toggleDevice(deviceId, token, isActive);
            this.plugin.setState(isActive ? StateType.OFF : StateType.ON, context);
            break;
          case "more":
            const nextLevel = ((deviceStatus.components.main.switchLevel.level.value as number) += 10);
            await this.setSwitchLevel(deviceId, token, nextLevel > 100 ? 100 : nextLevel)
            break;
          case "less":
            const prevLevel = ((deviceStatus.components.main.switchLevel.level.value as number) -= 10);
            await this.setSwitchLevel(deviceId, token, prevLevel < 0 ? 0 : prevLevel)
            break;
        }
      }
      if ("doorControl" in deviceStatus.components?.main) {
        const isActive = deviceStatus.components.main.doorControl.door.value === "open";
        await this.toggleDoor(deviceId, token, isActive)
      }
    }
  }

  private async getDeviceStatus(deviceId: string, token: string):Promise<DeviceStatus> {
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
}
