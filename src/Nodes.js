import * as THREE from 'three'
import React, { createContext, useMemo, useRef, useState, useContext, useLayoutEffect, forwardRef, useEffect } from 'react'
import { useFrame, useThree } from 'react-three-fiber'
import { Line, Text } from '@react-three/drei'
import { useDrag } from 'react-use-gesture'
import without from 'lodash-es/without'

const removeZ = new THREE.Vector3(1, 1, 0)
const temp = new THREE.Vector3()
const context = createContext()

function Dot(props) {
  return (
    <mesh {...props}>
      <circleGeometry args={[0.05, 16]} />
      <meshBasicMaterial color="#ff1050" />
    </mesh>
  )
}

function Nodes({ children, ...props }) {
  const [nodes, set] = useState([])
  const lines = useMemo(() => {
    const lines = []
    for (let node of nodes) {
      if (node.connectedTo.length) {
        const connections = node.connectedTo.map((ref) => [node.position, ref.current.position])
        connections.forEach(([start, end]) => {
          start = start.clone().add(temp.set(0.25, 0, 0))
          end = end.clone().add(temp.set(-0.25, 0, 0))
          const mid = start.clone().add(end.clone().sub(start)).add(new THREE.Vector3(0, (start.y - end.y), 0)) // prettier-ignore
          lines.push(new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20))
        })
      }
    }
    return lines
  }, [nodes])

  const group = useRef()
  useFrame((_, delta) => group.current.children.forEach((line) => (line.material.uniforms.dashOffset.value -= delta / 2)))

  return (
    <context.Provider value={set}>
      <group ref={group}>
        {lines.map((points, i) => (
          <Line key={i} points={points} {...props} />
        ))}
      </group>
      {children}
      {lines.map((points, i) => (
        <group key={i} position-z={1}>
          <Dot position={points[0]} />
          <Dot position={points[points.length - 1]} />
        </group>
      ))}
    </context.Provider>
  )
}

const Node = forwardRef(({ name, connectedTo = [], position = [0, 0, 0], ...props }, ref) => {
  const set = useContext(context)
  const { size, camera } = useThree()
  const [pos, setPos] = useState(() => new THREE.Vector3(...position))
  const state = useMemo(() => ({ position: pos, connectedTo }), [pos, connectedTo])

  useLayoutEffect(() => {
    // Register this node on mount
    set((nodes) => [...nodes, state])
    // Unregister on unmount
    return () => set((nodes) => without(nodes, state))
  }, [state, pos])

  // Drag n drop, hover
  const [hovered, setHovered] = useState(false)
  useEffect(() => (document.body.style.cursor = hovered ? 'grab' : 'auto'), [hovered])
  const bind = useDrag(({ down, xy: [x, y] }) => {
    document.body.style.cursor = down ? 'grabbing' : 'grab'
    const unprojectedPoint = temp.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1, 0).unproject(camera)
    setPos(unprojectedPoint.multiply(removeZ).clone())
  })

  return (
    <mesh ref={ref} {...bind()} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} position={pos} {...props}>
      <boxBufferGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial color={hovered ? '#ff1050' : 'black'} />
      <Text font="/Inter-Regular.woff" position-z={0.5} color="white" children={name} fontSize={0.2} />
    </mesh>
  )
})

export { Nodes, Node }
