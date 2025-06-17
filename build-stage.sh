#!/bin/bash

# 压缩 dist 目录
echo "Compressing dist directory..."
tar -czf dist.tar.gz dist

# 上传压缩文件到服务器
echo "Uploading dist.tar.gz to server..."
scp -i ~/Documents/us-east-1.pem dist.tar.gz my-ec2:/home/ec2-user/

# 清理本地压缩文件
echo "Cleaning up..."
rm dist.tar.gz

echo "Upload completed!"


# 解压文件
# echo "Uncompressing dist.tar.gz..."
# tar -xzf dist.tar.gz

# # 清理本地压缩文件
# echo "Cleaning up..."
# rm dist.tar.gz

/app/studio-garmin-face-designer-staging/dist