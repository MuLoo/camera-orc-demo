import './App.css';
import * as ocr from '@paddle-js-models/ocr';


import { useEffect, useRef, useState } from 'react';
// import * as ocrDet from "@paddle-js-models/ocrdet";

type Point = {
  x: number;
  y: number;
  color: string;
  radius: number;
};

// function thresholding(context: CanvasRenderingContext2D, threshold: number) {
//   const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
//   const data = imageData.data;
//   for (let i = 0; i < data.length; i += 4) {
//     const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
//     // 使用阈值进行二值化处理
//     const value = brightness < threshold ? 0 : 255;
//     data[i] = data[i + 1] = data[i + 2] = value;
//   }
//   context.putImageData(imageData, 0, 0);
// }

// // 归一化处理
// // 将图像的亮度和对比度调整到一个标准范围内，从而减少不同图像之间的差异，提高文字识别的准确性
// function normalize(context: CanvasRenderingContext2D) {
//   const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
//   const data = imageData.data;
//   let sum = 0;
//   let sum2 = 0;
//   for (let i = 0; i < data.length; i += 4) {
//     const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
//     sum += brightness;
//     sum2 += brightness * brightness;
//   }
//   const pixels = data.length / 4;
//   const mean = sum / pixels;
//   const std = Math.sqrt(sum2 / pixels - mean * mean);
//   for (let i = 0; i < data.length; i += 4) {
//     const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
//     const value = (brightness - mean) / std * 128 + 128;
//     data[i] = data[i + 1] = data[i + 2] = value;
//   }
//   context.putImageData(imageData, 0, 0);
// }

const MAGIC_WORD = '福';
const SUCCESS_WORD = '扫到啦';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRecoRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // const imgRecoRef = useRef<HTMLImageElement>(null);
  const [load, setLoad] = useState(false)
  const [imageDataURL, setImageDataURL] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [points, setPoints] = useState<any[]>([]);
  const [bingo, setBingo] = useState(false);

  useEffect(() => {
    async function load() {
      // await ocrDet.load();
      await ocr.init();
      console.log('已经加载完毕')
      setLoad(true)
    }
    load();
  }, []);

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        // const constraints = { video: true };  
        const constraints = {
          video: {
            facingMode: 'environment'
          },
        };  
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert(error);
      }
    };
    getVideoStream();
  }, []);

  // 绘制视频和效果
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let animationFrameId: number;
    let scanLineY = 20; // 扫描线的初始位置
    const frameWidth = 20; // 取景框的宽度
    const offset = 20; // 距离画布边缘的距离
    
    // let frameCount = 0; // 帧计数器, 用于当多少帧出现一次的时候
    
    // 创建一个数组来存储点的位置
    const points: Point[][] = [];// 创建一个数组来存储点的位置
    
    const drawVideoFrame = async () => {
      if (video && canvas) {

        const context = canvas.getContext('2d');

        if (video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // 如果点阵数组为空，则创建点阵数组
        if (points.length === 0) {
          for (let i = 0; i < 100; i++) { // 创建100行
            const row: Point[] = [];
            for (let j = 0; j < 56; j++) { // 每行创建50个点
              row.push({
                x: j * 10 + offset + frameWidth, // x坐标按照10的间距排列
                y: i * 10 + offset + frameWidth, // y坐标按照10的间距排列
                color: 'rgba(0, 255, 0, 0)', // 初始颜色为透明
                radius: 2, // 点的半径为2
              });
            }
            points.push(row);
          }
        }

        // 在每一帧中绘制这些点
        points.forEach(row => {
          row.forEach(point => {
            if (point.y <= scanLineY) { // 只有当点的 y 坐标小于或等于扫描线的 y 坐标时，才绘制这个点
              context!.beginPath();
              if (point.color === 'rgba(0, 255, 0, 0)') { // 如果点的颜色是透明的，那么将它的颜色设置为绿色
                point.color = 'rgba(0, 255, 0, 0.5)';
              }
              context!.fillStyle = point.color;
              context?.arc(point.x, point.y, point.radius, 0, Math.PI * 2, true); // 绘制一个圆形的点
              context!.fill();
            }
          });
        });

          // frameCount++; // 更新帧计数器

          // 绘制扫描线
          const scanLineHeight = 20; // 扫描线的高度
          const gradient = context!.createLinearGradient(0, scanLineY, 0, scanLineY + scanLineHeight);
          gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
          gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.4)'); // 中间颜色设置为深绿色
          gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
          context!.fillStyle = gradient;
          context?.fillRect(50, scanLineY, canvas.width - 100, scanLineHeight); // 在(scanLineY, 0)位置填充一个宽度为canvas.width，高度为10的矩形

          // 更新扫描线的位置
          scanLineY += 5;
          if (scanLineY > canvas.height - 40) {
            scanLineY = 20; // 如果扫描线已经移动到了画布的底部，就将它重置到顶部
          }

          // 绘制取景框
          context!.fillStyle = 'rgba(255, 255, 255, 0.5)'; // 设置填充颜色为半透明的白色
          context?.fillRect(offset, offset, canvas.width - 2 * offset, frameWidth); // 上边框
          context?.fillRect(offset, canvas.height - frameWidth - offset, canvas.width - 2 * offset, frameWidth); // 下边框
          context?.fillRect(offset, offset, frameWidth, canvas.height - 2 * offset); // 左边框
          context?.fillRect(canvas.width - frameWidth - offset, offset, frameWidth, canvas.height - 2 * offset); // 右边框

          // if (bingo) {
          //   // 绘制中奖动画
          // }

        }
      }
      animationFrameId = requestAnimationFrame(drawVideoFrame);
    };
    drawVideoFrame();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  // 识别过程
  useEffect(() => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const recognizeVideoFrame = async () => {
      // const worker = await createWorker('eng');
      if (video) {
        const intervalId = setInterval(async () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            // normalize(context); // 进行归一化处理
            // thresholding(context, 128);  // 进行二值化处理
            // 转换为 Data URL
            const imageDataURL = canvas.toDataURL();
            setImageDataURL(imageDataURL);
            if (load) {
              console.count('识别')
              const img = new Image();
              img.src = imageDataURL;
              img.onload = async () => {
                const res = await ocr.recognize(img);
                console.log('识别结果：', res);
                setText(res.text.reduce((total, cur) => total + `<p>${cur}</p>`))
                const totalWord = res.text.reduce((total, cur) => total + cur, '').replace(/\r|\s/g, '');
                setBingo(totalWord.toLocaleUpperCase().includes(MAGIC_WORD));
                setPoints(res.points);
              };
            }
          }
        }, 3000);
        return () => {
          clearInterval(intervalId);
        };
      }
    };
  
    recognizeVideoFrame();
  }, [load]);

  // 绘制文字识别区域
  useEffect(() => {
    const ctx = canvasRecoRef.current?.getContext('2d');
    function drawPoints(points: any[], canvas) {
      const img = imgRef.current;
      canvas!.width = img!.naturalWidth;
      canvas!.height = img!.naturalHeight;
      ctx!.drawImage(img!, 0, 0, canvas.width, canvas.height);
      points.forEach((point) => {
        // const scale = 300 / 640
        // 开始一个新的绘制路径
        ctx?.beginPath();
        // 设置线条颜色为蓝色
        ctx!.strokeStyle = "red";
        ctx!.lineWidth = 3;
        // 设置路径起点坐标
        ctx?.moveTo(point[0][0], point[0][1]);
        ctx?.lineTo(point[1][0], point[1][1]);
        ctx?.lineTo(point[2][0], point[2][1]);
        ctx?.lineTo(point[3][0], point[3][1]);
        ctx?.closePath();
        ctx?.stroke();
      });
    }
    if (points.length) {
      drawPoints(points, canvasRecoRef.current);
    }
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas!.getContext('2d');
  
    // 烟花粒子数组
    const particles: { x: number, y: number, vx: number, vy: number, life: number, color: string }[] = [];
  
    const animateText = () => {
      const animationDuration = 2000; // 动画持续时间（毫秒）
      const animationStart = performance.now(); // 动画开始时间
  
      const drawFrame = (timestamp: number) => {
        const progress = timestamp - animationStart; // 动画进度
        const fontSize = Math.min(progress / animationDuration * 80, 80); // 文本大小根据进度计算
        const opacity = Math.min(progress / animationDuration, 1); // 文本透明度根据进度计算
  
        // context!.clearRect(0, 0, canvas!.width, canvas!.height); // 清空画布
  
        // 绘制烟花粒子
        particles.forEach((particle, index) => {
          context!.fillStyle = particle.color;
          context!.beginPath();
          context!.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
          context!.closePath();
          context!.fill();
  
          // 更新粒子位置和生命周期
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.01;
  
          // 移除生命周期结束的粒子
          if (particle.life < 0) {
            particles.splice(index, 1);
          }
        });
  
        const gradient = context!.createLinearGradient(0, 0, canvas!.width, 0); // 创建渐变色
        gradient.addColorStop(0, 'pink'); // 添加渐变色的起始颜色
        gradient.addColorStop(1, 'purple'); // 添加渐变色的结束颜色

        context!.font = `bold ${fontSize}px CuteFont`; // 设置粗体可爱字体
        context!.fillStyle = gradient; // 设置渐变色作为字体颜色
  
        const textMetrics = context!.measureText(SUCCESS_WORD);
        const textWidth = textMetrics.width;
        const textHeight = fontSize; // 这是一个简化的假设，实际的文本高度可能会有所不同
  
        // const bounce = Math.sin(progress / 100) * 30; // 添加跳动效果
  
        context!.fillText(SUCCESS_WORD, (canvas!.width - textWidth) / 2, (canvas!.height + textHeight) / 2); // 绘制文本
  
        if (progress < animationDuration) {
          requestAnimationFrame(drawFrame); // 继续下一帧动画
        }
      };
  
      // 创建烟花粒子
      for (let i = 0; i < 100; i++) {
        const speed = Math.random() * 5 + 0.5;
        const angle = Math.random() * Math.PI * 2;
        const color = getRandomColor(); // 随机生成颜色
        particles.push({
          x: canvas!.width / 2,
          y: canvas!.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: color
        });
      }
  
      requestAnimationFrame(drawFrame); // 开始动画
    };
  
    if (bingo) {
      animateText(); // 执行动画
    }
  }, [bingo]);

  // 随机生成颜色
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };


  // useEffect(() => {
  //   async function ocrTest() {
  //     if (imgRef.current && load) {
  //       // const res = await ocrDet.detect(imgRef.current)
  //       const res = await ocr.recognize(imgRef.current, { canvas: canvasRef.current});
  //       console.log('你是啥： ', res)
  //     }
  //   }
  //   // ocrTest();
  // }, [imageDataURL]);

  return (
    <>
      <h2 style={{marginBottom: 20}}>DEMO</h2>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', width: 700}}>
        <div>
          <h4>视频</h4>
          <video ref={videoRef} autoPlay playsInline style={{ width: 300, height: 260 }}></video>
        </div>
        <div>
          <h4>图片帧</h4>
          <canvas ref={canvasRef} style={{width: 300, height: 260, objectFit: 'contain'}}></canvas>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', width: 700 }}>
        <div>
          <h4>抽样帧</h4>
          <img ref={imgRef} style={{ width: 300, height: 260, objectFit: 'contain' }} src={imageDataURL} alt="Video frame" />
        </div>
        <div>
          <h4>识别区域</h4>
          <canvas ref={canvasRecoRef} style={{ width: 300, height: 260, objectFit: 'contain' }} />
        </div>
      </div>
      <div style={{maxWidth: 700 }}>
          识别结果： <div dangerouslySetInnerHTML={{ __html: text }}></div>
        </div>
    </>
  );
}

export default App
