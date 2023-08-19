import {
  Constants,
  fetchProfile as fetchProfileFromXRInputSource,
  MotionController,
  Component,
} from "@webxr-input-profiles/motion-controllers/src";
import { VisualResponse } from "@webxr-input-profiles/motion-controllers/src/visualResponse.js";
import { Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { DEFAULT_PROFILES_PATH } from "./index.js";

//from https://github.com/mrdoob/three.js/blob/dev/examples/jsm/webxr/XRControllerModelFactory.js

const DEFAULT_CONTROLLER_PROFILE = "generic-trigger";

export type XRInputSourceData = {
  /**
   * array of profile ids from XRInputSource.profiles
   */
  profiles: Array<string>;
  /**
   * handedness of the input source
   * can be "left", "right", "any", or any additional by the profile supported handedness
   */
  handedness: string;
};

export async function fetchControllerProfile(
  inputSourceData: XRInputSourceData,
  basePath = DEFAULT_PROFILES_PATH,
  defaultProfileId = DEFAULT_CONTROLLER_PROFILE,
) {
  return fetchProfileFromXRInputSource(inputSourceData, basePath, defaultProfileId);
}

export async function createMotionController(
  xrInputSource: XRInputSource,
  basePath?: string,
  defaultProfileId?: string,
) {
  const { profile, assetPath } = await fetchControllerProfile(
    xrInputSource,
    basePath,
    defaultProfileId,
  );

  if (assetPath == null) {
    throw new Error(`unable to find pfile for input source`);
  }

  return new MotionController(xrInputSource, profile, assetPath);
}

export function bindMotionControllerToObject(
  motionController: MotionController,
  controller: Object3D,
) {
  // Loop through the components and find the nodes needed for each components' visual responses
  for (const component of Object.values<Component & { touchPointNode?: Object3D }>(
    motionController.components,
  )) {
    const { type, touchPointNodeName, visualResponses } = component;

    if (type === Constants.ComponentType.TOUCHPAD) {
      component.touchPointNode = controller.getObjectByName(touchPointNodeName);
      if (component.touchPointNode != null) {
        // Attach a touch dot to the touchpad.
        const sphereGeometry = new SphereGeometry(0.001);
        const material = new MeshBasicMaterial({ color: 0x0000ff, toneMapped: false });
        const sphere = new Mesh(sphereGeometry, material);
        component.touchPointNode.add(sphere);
      } else {
        console.warn(
          `Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${component.id}`,
        );
      }
    }

    // Loop through all the visual responses to be applied to this component
    for (const visualResponse of Object.values<
      VisualResponse & {
        minNode?: Object3D;
        maxNode?: Object3D;
        valueNode?: Object3D;
      }
    >(visualResponses)) {
      const { valueNodeName, minNodeName, maxNodeName, valueNodeProperty } = visualResponse;

      // If animating a transform, find the two nodes to be interpolated between.
      if (
        minNodeName != null &&
        maxNodeName != null &&
        valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM
      ) {
        visualResponse.minNode = controller.getObjectByName(minNodeName);
        visualResponse.maxNode = controller.getObjectByName(maxNodeName);

        // If the extents cannot be found, skip this animation
        if (visualResponse.minNode == null) {
          console.warn(`Could not find ${minNodeName} in the model`);
          return;
        }

        if (visualResponse.maxNode == null) {
          console.warn(`Could not find ${maxNodeName} in the model`);
          return;
        }
      }

      // If the target node cannot be found, skip this animation
      visualResponse.valueNode = controller.getObjectByName(valueNodeName);
      if (visualResponse.valueNode == null) {
        console.warn(`Could not find ${valueNodeName} in the model`);
      }
    }
  }
}

export function updateMotionController(motionController: MotionController) {
  // Cause the MotionController to poll the Gamepad for data
  motionController.updateFromGamepad();

  // Update the 3D model to reflect the button, thumbstick, and touchpad state
  for (const component of Object.values(motionController.components)) {
    // Update node data based on the visual responses' current states
    for (const visualResponse of Object.values<
      VisualResponse & {
        minNode?: Object3D;
        maxNode?: Object3D;
        valueNode?: Object3D;
      }
    >(component.visualResponses)) {
      const { valueNode, minNode, maxNode, value, valueNodeProperty } = visualResponse;

      // Skip if the visual response node is not found. No error is needed,
      // because it will have been reported at load time.
      if (valueNode == null || minNode == null || maxNode == null) {
        return;
      }

      // Calculate the new properties based on the weight supplied
      if (valueNodeProperty === Constants.VisualResponseProperty.VISIBILITY) {
        valueNode.visible = value as boolean;
      } else if (valueNodeProperty === Constants.VisualResponseProperty.TRANSFORM) {
        valueNode.quaternion.slerpQuaternions(
          minNode.quaternion,
          maxNode.quaternion,
          value as number,
        );

        valueNode.position.lerpVectors(minNode.position, maxNode.position, value as number);
      }
    }
  }
}
