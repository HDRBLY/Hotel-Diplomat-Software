@echo off
echo Setting up deployment to new repository...

REM Remove old remote
git remote remove origin

REM Add new remote
git remote add origin https://github.com/Amankumar945/HDR-Software.git

REM Add all changes
git add .

REM Commit changes
git commit -m "Complete Vercel-ready deployment setup - Fixed build script - Added all dependencies - Updated API configuration - Ready for production deployment"

REM Push to new repository
git push -u origin master

echo Deployment completed!
pause 