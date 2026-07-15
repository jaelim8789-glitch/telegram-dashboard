import socket
for port in [22, 80, 443, 2222, 8080, 3000, 8000]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    r = s.connect_ex(('130.94.32.152', port))
    if r == 0:
        status = 'OPEN'
    elif r == 10060:
        status = 'TIMEOUT'
    elif r == 10061:
        status = 'REFUSED'
    else:
        status = f'CODE_{r}'
    print(f'PORT_{port} = {status}')
    s.close()