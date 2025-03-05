 #!/bin/bash

docker build -t mf-node-app-template:latest .

docker tag mf-node-app-template:latest malcolmcfraser/mf-node-app-template:1.1

docker push malcolmcfraser/mf-node-app-template:1.1
