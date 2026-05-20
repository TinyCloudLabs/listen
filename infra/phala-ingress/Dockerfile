FROM dstacktee/dstack-ingress:20250924@sha256:40429d78060ef3066b5f93676bf3ba7c2e9ac47d4648440febfdda558aed4b32

RUN mv /scripts/entrypoint.sh /scripts/entrypoint-original.sh
COPY entrypoint.sh /scripts/entrypoint.sh
RUN chmod +x /scripts/entrypoint.sh /scripts/entrypoint-original.sh
