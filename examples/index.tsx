/* eslint-disable react/no-unknown-property */
import { Canvas, GroupProps, useLoader, useStore } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState } from "react";
import {
  SpaceGroup,
  XR,
  useEnterXR,
  useInputSourceEvent,
  useInputSources,
  useSessionGrant,
  DynamicControllerModel,
  DynamicHandModel,
  HandBoneGroup,
  useNativeFramebufferScaling,
  useHeighestAvailableFrameRate,
  CylinderLayer,
  QuadLayer,
  ImmersiveSessionOrigin,
  NonImmersiveCamera,
  getInputSourceId,
} from "@coconut-xr/natuerlich/react";
import { BoxGeometry, PlaneGeometry, TextureLoader, Vector3 } from "three";
import {
  InputDeviceFunctions,
  XSphereCollider,
  XStraightPointer,
  XWebPointers,
} from "@coconut-xr/xinteraction/react";
import { XIntersection, getDistanceSquaredInNDC } from "@coconut-xr/xinteraction";
import { Container, RootContainer, Text, isIntersectionNotClipped } from "@coconut-xr/koestlich";
import {
  Select,
  Button,
  Checkbox,
  Dropdown,
  DropdownContent,
  Link,
  Progess,
  Radio,
  Slider,
  StepConnection,
  StepNumber,
  StepNumbers,
  StepTitle,
  StepTitles,
  Steps,
  Tab,
  Table,
  TableCell,
  TableRow,
  Tabs,
  Toggle,
} from "@coconut-xr/kruemel";
import {
  Bars3,
  MagnifyingGlass,
  Pause,
  Play,
  Plus,
  Trash,
} from "@coconut-xr/kruemel/icons/outline";
import { AnchorObject } from "./anchor-object.js";
import { TeleportController, TeleportHand, TeleportTarget } from "../dist/defaults/teleport.js";
import { Plane } from "@react-three/drei";

const tableData = [
  ["Entry Name", "Entry Number", "Entry Description"],
  ["ABC", "1", "ABC is CBA reversed"],
  ["Koestlich", "2", "User Interfaces for Three.js"],
  ["Coconut XR", "3", "Powered by Coconut Capital GmbH"],
];

const sessionOptions: XRSessionInit = {
  requiredFeatures: ["local-floor", "hand-tracking", "anchors", "layers"],
};

export default function Index() {
  useSessionGrant();
  const [position, setPosition] = useState(new Vector3());
  const enterAR = useEnterXR("immersive-ar", sessionOptions);
  const enterVR = useEnterXR("immersive-vr", sessionOptions);
  const frameBufferScaling = useNativeFramebufferScaling();
  const frameRate = useHeighestAvailableFrameRate();
  return (
    <>
      <div style={{ zIndex: 1, position: "absolute", top: 0, left: 0 }}>
        <button onClick={() => enterAR()}>AR</button>
        <button onClick={() => enterVR()}>VR</button>
      </div>
      <Canvas
        dpr={window.devicePixelRatio}
        shadows
        gl={{ localClippingEnabled: true }}
        style={{ width: "100vw", height: "100svh", touchAction: "none" }}
        events={() => ({ enabled: false, priority: 0 })}
      >
        <ambientLight intensity={1} />
        <XR frameBufferScaling={frameBufferScaling} frameRate={frameRate} />
        <XWebPointers filterIntersections={(is) => is.filter(isIntersectionNotClipped)} />
        <ImmersiveSessionOrigin position={position}>
          <InputSources onTeleport={setPosition} />
        </ImmersiveSessionOrigin>
        <NonImmersiveCamera />
        <AnchorObject />
        <NormalTexture />
        <TeleportTarget>
          <Plane scale={100} rotation={[-Math.PI / 2, 0, 0]} />
        </TeleportTarget>
        <Suspense>
          <QuadLayerTexture />
        </Suspense>
        <CylinderLayerTexture />
        {/*<DoubleGrabCube />*/}
      </Canvas>
    </>
  );
}

const planeGeometry = new PlaneGeometry();

function NormalTexture() {
  const texture = useLoader(TextureLoader, "test.png");
  return (
    <mesh position={[1, 1, 0]} geometry={planeGeometry}>
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function QuadLayerTexture() {
  const texture = useLoader(TextureLoader, "test.png");
  return <QuadLayer position={[0, 1, 0]} texture={texture} />;
}

function CylinderLayerTexture() {
  const texture = useLoader(TextureLoader, "test.png");
  return <CylinderLayer index={-2} position={[-1, 0, 1.5]} texture={texture} />;
}

function InputSources({ onTeleport }: { onTeleport: (point: Vector3) => void }) {
  const inputSources = useInputSources();
  return (
    <>
      {inputSources.map((inputSource) =>
        inputSource == null || inputSource.handedness === "none" ? null : inputSource.hand !=
          null ? (
          <TeleportHand
            key={getInputSourceId(inputSource)}
            hand={inputSource.hand}
            onTeleport={onTeleport}
            inputSource={inputSource}
            id={inputSource.handedness === "left" ? -5 : -6}
          />
        ) : (
          //<Hand inputSource={inputSource} hand={inputSource.hand} />
          <TeleportController
            onTeleport={onTeleport}
            id={inputSource.handedness === "left" ? -5 : -6}
            key={getInputSourceId(inputSource)}
            inputSource={inputSource}
          />
        ),
      )}
    </>
  );
}

function Hand({ hand, inputSource }: { hand: XRHand; inputSource: XRInputSource }) {
  const pointerRef = useRef<InputDeviceFunctions>(null);
  const colliderRef = useRef<InputDeviceFunctions>(null);

  useInputSourceEvent("selectstart", inputSource, (e) => pointerRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => pointerRef.current?.release(0, e), []);

  useInputSourceEvent("selectstart", inputSource, (e) => colliderRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => colliderRef.current?.release(0, e), []);

  const store = useStore();

  return (
    <>
      <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
        {inputSource.handedness === "left" ? (
          <HandBoneGroup joint={"wrist"}>
            {/*<Koestlich
              position-x={0.1}
              position-y={0}
              position-z={0.1}
              rotation-z={(0.8 * Math.PI) / 2}
              rotation-x={(1.1 * -Math.PI) / 2}
              rotation-y={0.9 * Math.PI}
              scale={0.1}
        />*/}
          </HandBoneGroup>
        ) : (
          <>
            <HandBoneGroup joint={"index-finger-tip"}>
              <XSphereCollider
                radius={0.03}
                distanceElement={{ id: 0, downRadius: 0.01 }}
                id={inputSource.handedness === "left" ? -5 : -6}
                isDrag={(i1, i2) =>
                  getDistanceSquaredInNDC(store.getState().camera, i1.point, i2.point) > 0.000008
                }
                filterIntersections={(is) => is.filter(isIntersectionNotClipped)}
              />
            </HandBoneGroup>

            {/* <HandBoneGroup rotationJoint="wrist" joint={["thumb-tip", "index-finger-tip"]}>
              <XSphereCollider
                ref={colliderRef}
                radius={0.01}
                id={inputSource.handedness === "left" ? -3 : -4}
                filterIntersections={(is) => is.filter(isIntersectionNotClipped)}
              />
            </HandBoneGroup>*/}
          </>
        )}
      </DynamicHandModel>
      {/*<SpaceGroup space={inputSource.targetRaySpace}>
        <group rotation-y={Math.PI}>
          <XStraightPointer id={inputSource.handedness === "left" ? -1 : -2} ref={pointerRef} />
        </group>
        <mesh scale={[0.01, 0.01, 1]} geometry={geometry}>
          <meshBasicMaterial color={0xffffff} />
        </mesh>
  </SpaceGroup>*/}
    </>
  );
}

const geometry = new BoxGeometry();
geometry.translate(0, 0, -0.5);

function Controller({ inputSource }: { inputSource: XRInputSource }) {
  const pointerRef = useRef<InputDeviceFunctions>(null);
  const colliderRef = useRef<InputDeviceFunctions>(null);
  const intersectionLength = useRef(0);
  useInputSourceEvent("selectstart", inputSource, (e) => pointerRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => pointerRef.current?.release(0, e), []);

  useInputSourceEvent("squeezestart", inputSource, (e) => colliderRef.current?.press(0, e), []);
  useInputSourceEvent("squeezeend", inputSource, (e) => colliderRef.current?.release(0, e), []);

  const onIntersections = useCallback(
    (intersections: Array<XIntersection>) => {
      const prevIntersected = intersectionLength.current > 0;
      const currentIntersected = intersections.length > 0;
      intersectionLength.current = intersections.length;
      if (!(!prevIntersected && currentIntersected)) {
        return;
      }
      if (inputSource.gamepad == null) {
        return;
      }
      const [hapticActuator] = inputSource.gamepad.hapticActuators;
      if (hapticActuator == null) {
        return;
      }
      (hapticActuator as any).pulse(1, 100);
    },
    [inputSource],
  );

  return (
    <>
      {inputSource.gripSpace != null && (
        <SpaceGroup space={inputSource.gripSpace}>
          {inputSource.handedness === "left" ? (
            <Koestlich scale={0.05} />
          ) : (
            <XSphereCollider
              ref={colliderRef}
              radius={0.05}
              id={inputSource.handedness === "left" ? -3 : -4}
              filterIntersections={(is) => is.filter(isIntersectionNotClipped)}
            />
          )}
          <Suspense fallback={null}>
            <DynamicControllerModel inputSource={inputSource} />
          </Suspense>
        </SpaceGroup>
      )}
      <SpaceGroup space={inputSource.targetRaySpace}>
        <group rotation-y={Math.PI}>
          <XStraightPointer
            onIntersections={onIntersections}
            id={inputSource.handedness === "left" ? -1 : -2}
            ref={pointerRef}
            filterIntersections={(is) => is.filter(isIntersectionNotClipped)}
          />
        </group>

        <mesh scale={[0.01, 0.01, 1]} geometry={geometry}>
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      </SpaceGroup>
    </>
  );
}

function Koestlich(props: GroupProps) {
  const [checked, setChecked] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [sliderValue, setSliderValue] = useState(0.5);

  return (
    <group {...props}>
      <RootContainer
        backgroundOpacity={0.5}
        backgroundColor="white"
        height={3}
        width={3}
        alignItems="flex-start"
        padding={0.2}
        borderRadius={0.2}
        overflow="scroll"
        flexDirection="column"
      >
        <Text fontSize={0.2}>Button</Text>
        <Button onClick={() => setChecked((checked) => !checked)}>Toggle Checked</Button>

        <Text fontSize={0.2} marginTop={0.2}>
          Checkbox
        </Text>
        <Container
          alignItems="center"
          flexDirection="row"
          onClick={() => setChecked((checked) => !checked)}
        >
          <Checkbox marginRight={0.02} checked={checked} />
          <Text>Checked</Text>
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Toggle
        </Text>
        <Container
          alignItems="center"
          flexDirection="row"
          onClick={() => setChecked((checked) => !checked)}
        >
          <Toggle marginRight={0.02} checked={checked} />
          <Text>Checked</Text>
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Dropdown
        </Text>
        <Dropdown>
          <Button onClick={() => setChecked((checked) => !checked)}>Toggle Dropdown</Button>
          <DropdownContent
            border={0.003}
            borderColor="black"
            borderOpacity={0.5}
            padding={0.015}
            open={checked}
          >
            <Text>Dropdown Content</Text>
          </DropdownContent>
        </Dropdown>

        <Text fontSize={0.2} marginTop={0.2}>
          Slider
        </Text>
        <Slider value={sliderValue} range={10} onChange={setSliderValue} />

        <Text fontSize={0.2} marginTop={0.2}>
          Select
        </Text>
        <Select
          value={activeTab}
          options={new Array(3).fill(null).map((_, i) => ({ value: i, label: `Option ${i + 1}` }))}
          onChange={setActiveTab}
        />

        <Text fontSize={0.2} marginTop={0.2}>
          Radio
        </Text>
        <Container gapRow={0.1} alignItems="center" flexDirection="column">
          {new Array(3).fill(null).map((_, i) => (
            <Container
              key={i}
              alignItems="center"
              flexDirection="row"
              onClick={() => setActiveTab(i)}
            >
              <Radio marginRight={0.02} checked={i === activeTab ? true : false} />
              <Text>{`Radio ${i + 1}`}</Text>
            </Container>
          ))}
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Tabs
        </Text>
        <Tabs width="100%">
          {new Array(3).fill(null).map((_, i) => (
            <Tab key={i} onClick={() => setActiveTab(i)} active={i === activeTab}>{`Tab ${
              i + 1
            }`}</Tab>
          ))}
        </Tabs>

        <Text fontSize={0.2} marginTop={0.2}>
          Table
        </Text>
        <Table>
          {tableData.map((rowData, rowIndex) => (
            <TableRow key={rowIndex}>
              {rowData.map((cellData, columnIndex) => (
                <TableCell key={columnIndex}>
                  <Text>{cellData}</Text>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </Table>
        <Text fontSize={0.2} marginTop={0.2}>
          Link
        </Text>
        <Container flexDirection="row">
          <Text>Find our Website </Text>
          <Link href="https://coconut-xr.com" target="_blank">
            here.
          </Link>
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Steps
        </Text>
        <Steps maxWidth={4}>
          <StepNumbers>
            <StepNumber>1</StepNumber>
            <StepConnection />
            <StepNumber>2</StepNumber>
            <StepConnection />
            <StepNumber>3</StepNumber>
            <StepConnection backgroundColor="gray" />
            <StepNumber backgroundColor="gray">4</StepNumber>
          </StepNumbers>
          <StepTitles>
            <StepTitle>Login</StepTitle>
            <StepTitle>Do Something</StepTitle>
            <StepTitle>Logout</StepTitle>
            <StepTitle>Shut Down</StepTitle>
          </StepTitles>
        </Steps>

        <Text fontSize={0.2} marginTop={0.2}>
          Icons
        </Text>
        <Container flexWrap="wrap" flexDirection="row" gapColumn={0.1}>
          <Plus />
          <Play />
          <Pause />
          <Trash />
          <MagnifyingGlass />
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Pagination
        </Text>
        <Container flexDirection="row">
          <Button>1</Button>
          <Button backgroundColor="gray">2</Button>
          <Button backgroundColor="gray">3</Button>
          <Button backgroundColor="gray">4</Button>
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Navbar
        </Text>

        <Container
          width="100%"
          maxWidth={4}
          backgroundColor="black"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingY={0.06}
          paddingX={0.1}
          gapColumn={0.1}
        >
          <Bars3 height={0.05} color="white" />
          <Text color="white" fontSize={0.1}>
            COCONUT-XR
          </Text>
          <Container flexGrow={1} />
          <MagnifyingGlass color="white" />
          <Plus color="white" />
        </Container>

        <Text fontSize={0.2} marginTop={0.2}>
          Progress
        </Text>
        <Progess value={0.5} />
      </RootContainer>
    </group>
  );
}
