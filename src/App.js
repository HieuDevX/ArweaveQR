import React, { useState, useRef } from 'react';
import QRCode from 'qrcode.react';
import { Notyf } from 'notyf';

import UploadIcon from './assets/upload.svg';
import Logo from './assets/arweave.png';
import FolderIcon from './assets/folder.svg';
import LoginIcon from './assets/login.svg';
import Arweave from 'arweave/web';
import './App.scss';
import 'notyf/notyf.min.css';

const notyf = new Notyf({
  position: {
    x: 'right',
    y: 'top'
  }
});

const client = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

const options = {
  body: 'Your Arweave and QR Code are ready!',
  icon: 'https://webgiacoin.com/icon/5632.png'
};

const App = () => {
  const [link, setlink] = useState();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [login, setLogin] = useState(false);
  const [jwk, setJwk] = useState(false);
  const loginRef = useRef(null);

  const handleGetPermissionToReceiveNotifications = () => {
    if (!('Notification' in window)) alert('This browser does not support desktop notification');
    else if (Notification.permission !== 'denied') Notification.requestPermission();
  };

  const sendNotification = () => {
    if (!('Notification' in window)) {
      return alert('This browser does not support desktop notification');
    }
    new Notification('Arweave', options);
  };

  const handleOnFileChanged = (e) => setFile(e.target.files[0]);
  const handleChooseFile = () => fileInputRef.current.click();
  const allowDrop = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    setFile(file);
  };

  const handleLoginChanged = (e) => {
    let dataFile = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.onloadend = async (e) => {
      const jwk = JSON.parse(fileReader.result);
      setJwk(jwk);
      if (client) {
        client.wallets.jwkToAddress(jwk).then(async (address) => {
          console.log(address);
          setLogin(true);
        });
      }
    };
    if (dataFile) {
      fileReader.readAsText(dataFile);
    }
  };

  const handleLoginChoose = () => loginRef.current.click();
  const uploadFile = async () => {
    if (!file) return notyf.error('Upload a file');
    setLoading(true);
    let reader = new FileReader();
    reader.onloadend = async () => {
      //   let data = reader.result.split(',')[1];
      //   let binaryBlob = atob(data);
      let data = reader.result;
      var array = new Int8Array(data);
      let transaction = await client.createTransaction(
        {
          data: Buffer.from(array, 'utf8')
        },
        jwk
      );
      transaction.addTag('Content-Type', 'image/jpg');
      await client.transactions.sign(transaction, jwk);
      const response = await client.transactions.post(transaction);
      console.log(response, transaction);
      let uploader = await client.transactions.getUploader(transaction);
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(
          `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
        );
        setLoading(false);
        setlink(transaction.id);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const backToUpload = () => {
    setFile(null);
    setlink(null);
  };

  const _link = `https://arweave.net/${link}`;

  return (
    <div className='app-component'>
      <span className='header'>
        <img src={Logo} alt='logo' className='logo' />
        <h1>ArweaveQR</h1>
      </span>
      <h2>QR in the Arweave</h2>
      {!login ? (
        <div className='qrcode-container'>
          <input
            type='file'
            onChange={handleLoginChanged}
            style={{ display: 'none' }}
            ref={loginRef}
            accept='application/JSON'
          />
          <button onClick={handleLoginChoose} className='upload-button'>
            <img src={LoginIcon} alt='' />
            Login
          </button>
        </div>
      ) : link ? (
        <div className='qrcode-container'>
          <QRCode value={_link} className='qrcode' fgColor='#57b560' />
          <br />
          <button onClick={backToUpload} className='upload-button'>
            Back
          </button>
        </div>
      ) : loading ? (
        <div className='loading-container'>
          <h2>This could take a while...</h2>
          <p>
            In the meanwhile, do some exercise{' '}
            <span role='img' aria-label='muscle'>
              💪
            </span>
          </p>
          <button onClick={handleGetPermissionToReceiveNotifications} className='notify-button'>
            Notify meh
          </button>
          <div className='loader'></div>
        </div>
      ) : (
        <div
          className='upload-file-container'
          onDrop={handleDrop}
          onDragOver={allowDrop}
          onClick={handleChooseFile}
        >
          <div className='droparea'></div>
          <p
            style={{
              marginBottom: '10px',
              zIndex: 2,
              textAlign: 'center',
              color: '#5174537e'
            }}
          >
            Upload any media file by dragging it into the dropzone
          </p>
          <div className='file-input-container'>
            <input
              type='file'
              ref={fileInputRef}
              accept='image/*'
              onChange={handleOnFileChanged}
              style={{ display: 'none' }}
            />
            <button onClick={handleChooseFile} className='browse-button'>
              <img src={FolderIcon} alt='' /> Browse
            </button>
            <button onClick={uploadFile} className='upload-button'>
              <img src={UploadIcon} alt='' />
              Upload
            </button>
          </div>

          {file && <span className='filename'>Filename: {file.name}</span>}
        </div>
      )}
      {link && (
        <a className='skylink' href={_link} target='_blank' rel='noopener noreferrer'>
          Arweave link: {_link}
        </a>
      )}
      <a
        className='skynet-link'
        href='https://www.arweave.org/'
        target='_blank'
        rel='noopener noreferrer'
      >
        POWERED BY ARWEAVE{' '}
        <span role='img' aria-label='Green heart'>
          💚
        </span>
      </a>
    </div>
  );
};

export default App;
