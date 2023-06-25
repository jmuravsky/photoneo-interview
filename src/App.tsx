import React, { ChangeEvent, useState } from 'react';
import { styled } from 'styled-components';
import './App.css';

const InputFieldsSC = styled.div`
  position: absolute;
  top: 0;
  margin: auto;
  font-size: 12px;
  z-index: 1;
  input {
    border-radius: 100px;
    border: 1px black solid;
    background-color: white;
    color: lightgrey;
    margin-right: 15px;
  }
`;

const CanvasSC = styled.canvas`
  width: 100%;
  height: 100%;
  z-index: 0;
  background-color: white;
`;

enum PointColour {
  green ='GREEN',
  yellow = 'YELLOW',
  red = 'RED',
  black = 'BLACK',
}

type Point = {
  x: number;
  y: number;
  z: number;
  viewX?: number;
  viewY?: number;
  colour: PointColour;
}

type ColFile = {
  clustersFilter: [
    boolean,
    boolean,
    boolean,
  ];
  clustersIndices: [
    number[],
    number[],
    number[],
  ];
  pointCloudHeight: number;
  pointCloudWidth: number;
}

const canvasRenderPoints = (points: Point[]): void => {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if(!canvas){
    return
  }
  const context = canvas.getContext('2d');
  if(!context){
    return
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  console.log(canvas.width)

  points.forEach((point) => {
    if(point.viewX && point.viewY){
      context.beginPath();
      context.fillStyle = point.colour;

      // Adjust the point position based on the canvas size
      const canvasX = point.viewX * canvas.width + canvas.width / 2;
      const canvasY = canvas.height / 2 - point.viewY * canvas.height;

      // Render a circle at the point position
      context.arc(canvasX, canvasY, 1.5, 0, 2 * Math.PI);
      context.fill();
      context.closePath();
    }
  });
}

const convert3DTo2D = (
  point3D: Point,
  cameraPosition: Point,
  aspectRatio: number,
): { x: number; y: number } => {
  const viewportSize = { width: 100 * aspectRatio, height: 100 }; // Default viewport size as an example
  const halfFOV = (120 / 2) * (Math.PI / 180);
  const tanHalfFOV = Math.tan(halfFOV);
  
  // Calculate the normalized direction vector from the camera to the point
  const direction = {
    x: point3D.x - cameraPosition.x,
    y: point3D.y - cameraPosition.y,
    z: point3D.z - cameraPosition.z,
  };
  
  // Apply perspective projection
  const projectedX = (direction.x / direction.z) * (viewportSize.width / 2) * tanHalfFOV;
  const projectedY = (direction.y / direction.z) * (viewportSize.height / 2) * tanHalfFOV / aspectRatio;

  const xPercent = (projectedX + viewportSize.width / 2) / viewportSize.width;
  const yPercent = (projectedY + viewportSize.height / 2) / viewportSize.height;

  return {
    x: xPercent,
    y: yPercent,
  };
}

const App = () => {
  const [pointCloud, setPointCloud] = useState<Point[]>([]);
  const camera ={x: -0.51,y:-0.8,z:2.7, colour: PointColour.black};

  const handlePCChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const tgt = e.currentTarget as HTMLInputElement;
    if (tgt.files?.length !== 1) {
      return
    }
    const PCFile =  tgt.files[0];
    const PCFileContents = await PCFile.text();
    if (!PCFileContents.split('\n')[0].startsWith('ply') || !PCFileContents.split('\n')[1].startsWith('format ascii')){
      return
    }
    const points: Point[] = [];
    const headerEndIndex = PCFileContents.split('\n').findIndex((a) => a.startsWith('end_header'))
    PCFileContents.split('\n').slice(headerEndIndex+1).map((pointDef) => {
      const pointArr: number[] = pointDef.split(' ').map((a) => parseFloat(a))
      if(pointArr.length < 3){
        return null;
      }
      const point: Point = {
        x: pointArr[0],
        y: pointArr[1],
        z: pointArr[2],
        colour: PointColour.black,
      }
      points.push(point)
    })

    const viewPoints = points.map((point) => {
      if(point.viewX){
        return point;
      }
      const {x: viewX, y: viewY} = convert3DTo2D(point,camera,window.innerWidth/window.innerHeight);
      point.viewX = viewX;
      point.viewY = viewY;
      return point;
    })

    setPointCloud(viewPoints);
    canvasRenderPoints(viewPoints);
  }
  
  const handleColoursChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const tgt = e.currentTarget as HTMLInputElement;
    if (tgt.files?.length !== 1) {
      return
    }
    const colPoints = new Array<Point>(pointCloud.length)
    const colFile =  tgt.files[0];
    const ColFileContents: ColFile = JSON.parse(await colFile.text());
    console.log(ColFileContents)
    ColFileContents.clustersIndices[0].map((index) => {
      colPoints[index] = {...pointCloud[index], colour: PointColour.green}
    }) 
    ColFileContents.clustersIndices[1].map((index) => {
      colPoints[index] = {...pointCloud[index], colour: PointColour.yellow}
    }) 
    ColFileContents.clustersIndices[2].map((index) => {
      colPoints[index] = {...pointCloud[index], colour: PointColour.red}
    }) 
    setPointCloud(colPoints);
    canvasRenderPoints(colPoints);
  }

  return (
    <div className="App">
      <header className="App-header">
        <InputFieldsSC>
          <label htmlFor='point-cloud'>Pointcloud: </label>
          <input type='file' name='point-cloud' onChange={handlePCChange}></input>
          <label htmlFor='clustering'>Clustering: </label>
          <input type='file' name='clustering' onChange={handleColoursChange}></input>
        </InputFieldsSC> 
        <CanvasSC id='viewport' />
      </header>
    </div>
  );
}

export default App;
